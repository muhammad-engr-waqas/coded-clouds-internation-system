import Invoice from '../models/Invoice.js';
import { logAudit } from '../utils/audit.js';

/**
 * @route  POST /api/invoices
 * @access Admin, HR
 * Save a generated invoice to the database.
 */
export const createInvoice = async (req, res) => {
  const {
    invoiceNumber, date, currency,
    clientName, clientContact, billNumber,
    services, notes, templateStyle,
  } = req.body;

  if (!invoiceNumber) return res.status(400).json({ message: 'invoiceNumber is required' });

  const grandTotal = (services || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const invoice = await Invoice.create({
    invoiceNumber,
    date:          date          || new Date().toISOString().slice(0, 10),
    currency:      currency      || 'SAR',
    clientName:    clientName    || '',
    clientContact: clientContact || '',
    billNumber:    billNumber    || '',
    services:      services      || [],
    notes:         notes         || '',
    templateStyle: templateStyle || 'classic',
    grandTotal,
    createdBy: req.user._id,
  });

  await logAudit({
    actor:    req.user._id,
    action:   'CREATED_INVOICE',
    module:   'Invoice',
    targetId: invoice._id,
    details:  { invoiceNumber, clientName, grandTotal, currency },
  });

  res.status(201).json(invoice);
};

/**
 * @route  GET /api/invoices
 * @access Admin, HR
 * Returns all invoices sorted newest first.
 * Supports optional query: ?search=clientName&currency=SAR&limit=50&page=1
 */
export const getInvoices = async (req, res) => {
  const { search, currency, page = 1, limit = 50 } = req.query;

  const query = {};
  if (currency) query.currency = currency;
  if (search) {
    const re = { $regex: search, $options: 'i' };
    query.$or = [
      { clientName:    re },
      { invoiceNumber: re },
      { billNumber:    re },
    ];
  }

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await Invoice.countDocuments(query);
  const invoices = await Invoice.find(query)
    .populate('createdBy', 'fullName role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.json({ invoices, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
};

/**
 * @route  GET /api/invoices/:id
 * @access Admin, HR
 */
export const getInvoiceById = async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate('createdBy', 'fullName role');
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  res.json(invoice);
};

/**
 * @route  DELETE /api/invoices/:id
 * @access Admin, HR
 */
export const deleteInvoice = async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  await logAudit({
    actor:    req.user._id,
    action:   'DELETED_INVOICE',
    module:   'Invoice',
    targetId: invoice._id,
    details:  { invoiceNumber: invoice.invoiceNumber, clientName: invoice.clientName },
  });

  await invoice.deleteOne();
  res.json({ message: 'Invoice deleted', id: req.params.id });
};
