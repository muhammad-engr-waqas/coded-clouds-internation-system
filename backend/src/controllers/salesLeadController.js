import SalesLead from '../models/SalesLead.js';
import LeadActivity from '../models/LeadActivity.js';
import User from '../models/User.js';
import { logAudit } from '../utils/audit.js';
import { notifyUser } from '../utils/notify.js';
import { toDateOnly } from '../utils/dateHelpers.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Record a change to the activity log */
async function recordActivity(leadId, leadRefId, actor, action, changes = [], note = '') {
  try {
    await LeadActivity.create({
      leadId,
      leadRefId,
      actor: actor._id,
      actorName: actor.fullName,
      action,
      changes,
      note,
    });
  } catch (e) {
    console.error('LeadActivity log failed:', e.message);
  }
}

/** Build a diff array between oldDoc and newFields */
function buildDiff(oldDoc, newFields) {
  const tracked = [
    'companyName', 'contactPerson', 'phone', 'email', 'city', 'industry',
    'source', 'requirement', 'leadStatus', 'followUpDate', 'remarks', 'assignedTo', 'date',
  ];
  const changes = [];
  for (const field of tracked) {
    if (newFields[field] === undefined) continue;
    const from = oldDoc[field] instanceof Date
      ? oldDoc[field].toISOString().slice(0, 10)
      : String(oldDoc[field] ?? '');
    const to   = newFields[field] instanceof Date
      ? new Date(newFields[field]).toISOString().slice(0, 10)
      : String(newFields[field] ?? '');
    if (from !== to) changes.push({ field, from, to });
  }
  return changes;
}

/** Today's YYYY-MM-DD in local terms */
function todayStr() { return new Date().toISOString().slice(0, 10); }

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/sales-leads
 * @access Admin (all), Sales (own)
 * Supports filters: assignedTo, status, source, city, industry, dateFrom, dateTo, search, page, limit
 */
export const getLeads = async (req, res) => {
  const {
    assignedTo, status, source, city, industry,
    dateFrom, dateTo, search,
    page = 1, limit = 500,
  } = req.query;

  const query = {};

  // Scope: Sales users see only their own leads
  if (req.user.role === 'Sales') {
    query.assignedTo = req.user._id;
  } else if (assignedTo && assignedTo !== 'all') {
    query.assignedTo = assignedTo;
  }

  if (status)   query.leadStatus = status;
  if (source)   query.source     = source;
  if (city)     query.city       = { $regex: city, $options: 'i' };
  if (industry) query.industry   = { $regex: industry, $options: 'i' };

  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = new Date(dateFrom);
    if (dateTo)   query.date.$lte = new Date(dateTo + 'T23:59:59Z');
  }

  if (search) {
    const re = { $regex: search, $options: 'i' };
    query.$or = [
      { companyName: re }, { contactPerson: re },
      { phone: re }, { email: re }, { leadId: re },
    ];
  }

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await SalesLead.countDocuments(query);
  const leads = await SalesLead.find(query)
    .populate('assignedTo', 'fullName role avatarUrl')
    .populate('createdBy',  'fullName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.json({ leads, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
};

/**
 * @route  POST /api/sales-leads
 * @access Admin, Sales
 */
export const createLead = async (req, res) => {
  const {
    date, companyName, contactPerson, phone, email, city, industry,
    source, requirement, leadStatus, followUpDate, assignedTo, remarks,
  } = req.body;

  // Sales users can only create leads assigned to themselves
  const effectiveAssignee =
    req.user.role === 'Sales' ? req.user._id : (assignedTo || req.user._id);

  const lead = await SalesLead.create({
    date:          date          || new Date(),
    companyName:   companyName   || '',
    contactPerson: contactPerson || '',
    phone:         phone         || '',
    email:         email         || '',
    city:          city          || '',
    industry:      industry      || '',
    source:        source        || '',
    requirement:   requirement   || '',
    leadStatus:    leadStatus    || 'New',
    followUpDate:  followUpDate  || null,
    assignedTo:    effectiveAssignee,
    remarks:       remarks       || '',
    createdBy:     req.user._id,
    lastEditedBy:  req.user._id,
  });

  await recordActivity(lead._id, lead.leadId, req.user, 'CREATED', [], companyName || '');
  await logAudit({ actor: req.user._id, action: 'CREATED_LEAD', module: 'SalesLead', targetId: lead._id, details: { leadId: lead.leadId, companyName } });

  const populated = await lead.populate([
    { path: 'assignedTo', select: 'fullName role avatarUrl' },
    { path: 'createdBy',  select: 'fullName' },
  ]);

  // Notify the assignee if Admin created on behalf of someone else
  if (req.user.role === 'Admin' && String(effectiveAssignee) !== req.user._id) {
    const io = req.app.get('io');
    await notifyUser(io, effectiveAssignee, {
      type: 'LEAD_ASSIGNED',
      title: 'New lead assigned to you',
      message: companyName || 'New lead',
      link: '/sales/leads',
    });
  }

  res.status(201).json(populated);
};

/**
 * @route  PATCH /api/sales-leads/:id
 * @access Admin (any), Sales (own leads only)
 */
export const updateLead = async (req, res) => {
  const lead = await SalesLead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  // Sales user can only edit their own leads
  if (req.user.role === 'Sales' && String(lead.assignedTo) !== req.user._id) {
    return res.status(403).json({ message: 'You can only edit your own leads' });
  }

  const editable = [
    'date', 'companyName', 'contactPerson', 'phone', 'email', 'city', 'industry',
    'source', 'requirement', 'leadStatus', 'followUpDate', 'remarks',
  ];
  // Admin can also re-assign
  if (req.user.role === 'Admin') editable.push('assignedTo');

  const diff = buildDiff(lead.toObject(), req.body);

  editable.forEach(f => {
    if (req.body[f] !== undefined) lead[f] = req.body[f] === '' && f !== 'remarks' ? lead[f] : req.body[f];
  });
  lead.lastEditedBy = req.user._id;
  await lead.save();

  if (diff.length > 0) {
    const action = diff.some(d => d.field === 'leadStatus') ? 'STATUS_CHANGED'
                 : diff.some(d => d.field === 'assignedTo') ? 'ASSIGNED'
                 : 'UPDATED';
    await recordActivity(lead._id, lead.leadId, req.user, action, diff);
  }

  await logAudit({ actor: req.user._id, action: 'UPDATED_LEAD', module: 'SalesLead', targetId: lead._id, details: { diff } });

  const populated = await lead.populate([
    { path: 'assignedTo', select: 'fullName role avatarUrl' },
    { path: 'createdBy',  select: 'fullName' },
  ]);
  res.json(populated);
};

/**
 * @route  DELETE /api/sales-leads/:id
 * @access Admin only
 */
export const deleteLead = async (req, res) => {
  const lead = await SalesLead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: 'Lead not found' });

  await recordActivity(lead._id, lead.leadId, req.user, 'DELETED', [], lead.companyName);
  await logAudit({ actor: req.user._id, action: 'DELETED_LEAD', module: 'SalesLead', targetId: lead._id, details: { leadId: lead.leadId } });
  await lead.deleteOne();

  res.json({ message: 'Lead deleted', id: req.params.id });
};

/**
 * @route  POST /api/sales-leads/bulk
 * @access Admin, Sales
 * Body: { rows: SalesLead[] }  — upsert by _id; rows without _id are created only ONCE
 * (deduped by a client-supplied tempKey to prevent repeated auto-save creating duplicates)
 */
export const bulkUpsert = async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ message: 'rows must be an array' });

  const results = [];

  for (const row of rows) {
    const {
      _id, id,
      date, companyName, contactPerson, phone, email, city, industry,
      source, requirement, leadStatus, followUpDate, assignedTo, remarks,
    } = row;

    const docId = _id || id;

    // Determine assignee
    const effectiveAssignee =
      req.user.role === 'Sales' ? req.user._id : (assignedTo || req.user._id);

    if (docId) {
      // ── Update existing row ─────────────────────────────────────────
      const existing = await SalesLead.findById(docId);
      if (!existing) continue;
      if (req.user.role === 'Sales' && String(existing.assignedTo) !== req.user._id) continue;

      const diff = buildDiff(existing.toObject(), row);
      const fields = { date, companyName, contactPerson, phone, email, city, industry, source, requirement, leadStatus, followUpDate, remarks };
      if (req.user.role === 'Admin') fields.assignedTo = effectiveAssignee;
      Object.entries(fields).forEach(([k, v]) => { if (v !== undefined) existing[k] = v; });
      existing.lastEditedBy = req.user._id;
      await existing.save();
      if (diff.length > 0) {
        const action = diff.some(d => d.field === 'leadStatus') ? 'STATUS_CHANGED' : 'UPDATED';
        await recordActivity(existing._id, existing.leadId, req.user, action, diff);
      }
      results.push(existing);
    } else {
      // ── Create new row ──────────────────────────────────────────────
      // Safety dedup: if a row with same companyName+phone already exists for this
      // assignee in the same month, update it instead of creating a duplicate.
      // This prevents repeated auto-save calls from creating N copies.
      let dedup = null;
      if (companyName || phone) {
        const dupQuery = {
          assignedTo: effectiveAssignee,
          ...(companyName ? { companyName: companyName.trim() } : {}),
          ...(phone       ? { phone: phone.trim() }             : {}),
        };
        dedup = await SalesLead.findOne(dupQuery).sort({ createdAt: -1 });
      }

      if (dedup) {
        // Treat as an update
        const diff = buildDiff(dedup.toObject(), row);
        const fields = { date, companyName, contactPerson, phone, email, city, industry, source, requirement, leadStatus, followUpDate, remarks };
        Object.entries(fields).forEach(([k, v]) => { if (v !== undefined) dedup[k] = v; });
        dedup.lastEditedBy = req.user._id;
        await dedup.save();
        if (diff.length > 0) {
          await recordActivity(dedup._id, dedup.leadId, req.user, 'UPDATED', diff);
        }
        results.push(dedup);
      } else {
        const newLead = await SalesLead.create({
          date:          date          || new Date(),
          companyName:   companyName   || '',
          contactPerson: contactPerson || '',
          phone:         phone         || '',
          email:         email         || '',
          city:          city          || '',
          industry:      industry      || '',
          source:        source        || '',
          requirement:   requirement   || '',
          leadStatus:    leadStatus    || 'New',
          followUpDate:  followUpDate  || null,
          assignedTo:    effectiveAssignee,
          remarks:       remarks       || '',
          createdBy:     req.user._id,
          lastEditedBy:  req.user._id,
        });
        await recordActivity(newLead._id, newLead.leadId, req.user, 'CREATED', [], companyName || '');
        results.push(newLead);
      }
    }
  }
  // Populate all results
  const populated = await SalesLead.populate(results, [
    { path: 'assignedTo', select: 'fullName role avatarUrl' },
    { path: 'createdBy',  select: 'fullName' },
  ]);

  res.json({ saved: populated.length, rows: populated });
};

/**
 * @route  POST /api/sales-leads/import
 * @access Admin, Sales
 * Body: { rows: raw[] }  — imported from Excel/CSV paste
 */
export const importLeads = async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0)
    return res.status(400).json({ message: 'rows must be a non-empty array' });

  const created = [];
  for (const row of rows) {
    const effectiveAssignee =
      req.user.role === 'Sales' ? req.user._id : (row.assignedTo || req.user._id);

    const lead = await SalesLead.create({
      date:          row.date          ? new Date(row.date) : new Date(),
      companyName:   row.companyName   || '',
      contactPerson: row.contactPerson || '',
      phone:         row.phone         || '',
      email:         row.email         || '',
      city:          row.city          || '',
      industry:      row.industry      || '',
      source:        row.source        || '',
      requirement:   row.requirement   || '',
      leadStatus:    row.leadStatus    || 'New',
      followUpDate:  row.followUpDate  ? new Date(row.followUpDate) : null,
      assignedTo:    effectiveAssignee,
      remarks:       row.remarks       || '',
      createdBy:     req.user._id,
      lastEditedBy:  req.user._id,
    });
    await recordActivity(lead._id, lead.leadId, req.user, 'IMPORTED');
    created.push(lead);
  }

  await logAudit({ actor: req.user._id, action: 'IMPORTED_LEADS', module: 'SalesLead', details: { count: created.length } });
  res.status(201).json({ imported: created.length, rows: created });
};

/**
 * @route  POST /api/sales-leads/:id/duplicate
 * @access Admin, Sales (own)
 */
export const duplicateLead = async (req, res) => {
  const source = await SalesLead.findById(req.params.id);
  if (!source) return res.status(404).json({ message: 'Lead not found' });
  if (req.user.role === 'Sales' && String(source.assignedTo) !== req.user._id)
    return res.status(403).json({ message: 'You can only duplicate your own leads' });

  const copy = await SalesLead.create({
    date:          new Date(),
    companyName:   source.companyName,
    contactPerson: source.contactPerson,
    phone:         source.phone,
    email:         source.email,
    city:          source.city,
    industry:      source.industry,
    source:        source.source,
    requirement:   source.requirement,
    leadStatus:    'New',
    followUpDate:  null,
    assignedTo:    source.assignedTo,
    remarks:       source.remarks,
    createdBy:     req.user._id,
    lastEditedBy:  req.user._id,
  });

  await recordActivity(copy._id, copy.leadId, req.user, 'ROW_DUPLICATED', [], `Duplicated from ${source.leadId}`);
  const populated = await copy.populate([
    { path: 'assignedTo', select: 'fullName role avatarUrl' },
    { path: 'createdBy',  select: 'fullName' },
  ]);
  res.status(201).json(populated);
};

// ─── Stats / Dashboard ────────────────────────────────────────────────────────

/**
 * @route  GET /api/sales-leads/stats
 * @access Admin (all or filtered), Sales (own)
 * Query: assignedTo, dateFrom, dateTo, source, city, industry, status
 * Returns: counts per status, today counts, follow-up stats, leaderboard
 */
export const getStats = async (req, res) => {
  const { assignedTo, dateFrom, dateTo, source, city, industry, status } = req.query;

  // Base query for scope
  const baseQ = {};
  if (req.user.role === 'Sales') {
    baseQ.assignedTo = req.user._id;
  } else if (assignedTo && assignedTo !== 'all') {
    baseQ.assignedTo = assignedTo;
  }
  if (source)   baseQ.source   = source;
  if (city)     baseQ.city     = { $regex: city,     $options: 'i' };
  if (industry) baseQ.industry = { $regex: industry, $options: 'i' };
  if (status)   baseQ.leadStatus = status;

  // Date range on the lead's `date` field
  if (dateFrom || dateTo) {
    baseQ.date = {};
    if (dateFrom) baseQ.date.$gte = new Date(dateFrom);
    if (dateTo)   baseQ.date.$lte = new Date(dateTo + 'T23:59:59Z');
  }

  const today     = new Date(); today.setHours(0,0,0,0);
  const todayEnd  = new Date(); todayEnd.setHours(23,59,59,999);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
  const monthStart= new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalAll,
    totalToday,
    totalWeek,
    totalMonth,
    byStatus,
    updatedToday,
    followUpPending,
    leaderboard,
  ] = await Promise.all([
    // Total matching base query
    SalesLead.countDocuments(baseQ),

    // Today (by lead date)
    SalesLead.countDocuments({ ...baseQ, date: { $gte: today, $lte: todayEnd } }),

    // This week
    SalesLead.countDocuments({ ...baseQ, date: { $gte: weekStart } }),

    // This month
    SalesLead.countDocuments({ ...baseQ, date: { $gte: monthStart } }),

    // Count per status
    SalesLead.aggregate([
      { $match: baseQ },
      { $group: { _id: '$leadStatus', count: { $sum: 1 } } },
    ]),

    // Updated today (updatedAt today)
    SalesLead.countDocuments({ ...baseQ, updatedAt: { $gte: today, $lte: todayEnd } }),

    // Follow-ups: today or overdue (followUpDate <= today end)
    SalesLead.countDocuments({
      ...baseQ,
      followUpDate: { $lte: todayEnd },
      leadStatus: { $nin: ['Won', 'Lost', 'Not Interested'] },
    }),

    // Leaderboard — only for Admin
    req.user.role === 'Admin'
      ? SalesLead.aggregate([
          { $match: baseQ },
          { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
          { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
          { $project: { count: 1, fullName: '$user.fullName', avatarUrl: '$user.avatarUrl', role: '$user.role' } },
        ])
      : [],
  ]);

  const statusMap = Object.fromEntries(byStatus.map(s => [s._id, s.count]));

  res.json({
    total: { all: totalAll, today: totalToday, week: totalWeek, month: totalMonth },
    byStatus: statusMap,
    updatedToday,
    followUpPending,
    leaderboard,
  });
};

/**
 * @route  GET /api/sales-leads/activity
 * @access Admin (all), Sales (own leads)
 * Returns recent activity log entries
 */
export const getActivity = async (req, res) => {
  const { leadId, page = 1, limit = 50 } = req.query;
  const query = {};

  if (leadId) {
    query.leadId = leadId;
  } else if (req.user.role === 'Sales') {
    // Only show activity on their own leads
    const myLeadIds = await SalesLead.find({ assignedTo: req.user._id }).distinct('_id');
    query.leadId = { $in: myLeadIds };
  }

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await LeadActivity.countDocuments(query);
  const items = await LeadActivity.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.json({ items, total });
};

/**
 * @route  GET /api/sales-leads/salespeople
 * @access Admin only — returns list of users with role=Sales
 */
export const getSalespeople = async (req, res) => {
  const people = await User.find({ role: 'Sales', status: 'Active' })
    .select('fullName email avatarUrl department');
  res.json(people);
};

/**
 * @route  GET /api/sales-leads/industries
 * @access Admin, Sales — distinct industry list for dropdown
 */
export const getIndustries = async (req, res) => {
  const industries = await SalesLead.distinct('industry');
  res.json(industries.filter(Boolean).sort());
};
