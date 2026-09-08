import User from '../models/User.js';
import Channel from '../models/Channel.js';
import { logAudit } from '../utils/audit.js';
import { notifyUser } from '../utils/notify.js';
import { buildFileUrl } from '../middleware/upload.js';

// @route GET /api/employees
// Access: Admin, HR  (directory listing, search/filter/paginate)
export const getEmployees = async (req, res) => {
  const { search, role, department, status, page = 1, limit = 20 } = req.query;
  const query = {};

  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
    ];
  }
  if (role) query.role = role;
  if (department) query.department = department;
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [employees, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(query),
  ]);

  res.json({
    employees: employees.map((e) => e.toSafeObject()),
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
};

// @route POST /api/employees
// Access: Admin, HR — creates employee. Only Name/Username/Password/Email/Role required.
export const createEmployee = async (req, res) => {
  const {
    fullName,
    username,
    password,
    email,
    phone,
    role,
    department,
    designation,
    joiningDate,
    reportingManagerId,
    basicSalary,
  } = req.body;

  if (!fullName || !username || !password || !email || !role) {
    return res.status(400).json({ message: 'Name, Username, Password, Email and Role are required' });
  }

  const employee = await User.create({
    fullName,
    username: username.toLowerCase(),
    password,
    email: email.toLowerCase(),
    phone,
    role,
    department,
    designation,
    joiningDate,
    reportingManagerId: reportingManagerId && reportingManagerId.trim() !== '' ? reportingManagerId : null,
    basicSalary: basicSalary || 0,
  });

  await logAudit({
    actor: req.user._id,
    action: 'CREATED_EMPLOYEE',
    module: 'Employee',
    targetId: employee._id,
    details: { fullName, role, addedBy: req.user.role },
  });

  // Auto-add new employee to the #announcements channel so they see it immediately
  await Channel.updateOne({ isAnnouncements: true }, { $addToSet: { memberIds: employee._id } });

  const io = req.app.get('io');
  await notifyUser(io, employee._id, {
    type: 'SYSTEM',
    title: 'Welcome to Coded Clouds!',
    message: 'Your account has been created.',
  });

  res.status(201).json(employee.toSafeObject());
};

// @route GET /api/employees/:id
// Access: Admin, HR
export const getEmployeeById = async (req, res) => {
  const employee = await User.findById(req.params.id).populate('reportingManagerId', 'fullName role');
  if (!employee) return res.status(404).json({ message: 'Employee not found' });
  res.json(employee.toSafeObject());
};

// @route PATCH /api/employees/:id
// Access: Admin, HR — includes basicSalary editing
export const updateEmployee = async (req, res) => {
  const employee = await User.findById(req.params.id);
  if (!employee) return res.status(404).json({ message: 'Employee not found' });

  const editable = [
    'fullName',
    'phone',
    'role',
    'department',
    'designation',
    'joiningDate',
    'reportingManagerId',
    'status',
    'basicSalary',
    'avatarUrl',
  ];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) {
      // Empty string for ObjectId fields must become null
      if (field === 'reportingManagerId') {
        employee[field] = req.body[field] && req.body[field].trim() !== '' ? req.body[field] : null;
      } else {
        employee[field] = req.body[field];
      }
    }
  });

  const salaryChanged = req.body.basicSalary !== undefined;
  await employee.save();

  await logAudit({
    actor: req.user._id,
    action: 'UPDATED_EMPLOYEE',
    module: 'Employee',
    targetId: employee._id,
    details: { changedFields: Object.keys(req.body), by: req.user.role },
  });

  res.json({ ...employee.toSafeObject(), salaryChanged });
};

// @route DELETE /api/employees/:id
// Access: Admin, HR
export const deleteEmployee = async (req, res) => {
  const employee = await User.findById(req.params.id);
  if (!employee) return res.status(404).json({ message: 'Employee not found' });

  await employee.deleteOne();

  await logAudit({
    actor: req.user._id,
    action: 'DELETED_EMPLOYEE',
    module: 'Employee',
    targetId: req.params.id,
    details: { fullName: employee.fullName },
  });

  res.json({ message: 'Employee removed successfully' });
};

// @route PATCH /api/employees/:id/status  (Suspend/Activate/Separate)
// Access: Admin, HR
export const updateEmployeeStatus = async (req, res) => {
  const { status } = req.body; // 'Active' | 'Suspended' | 'Separated'
  const employee = await User.findById(req.params.id);
  if (!employee) return res.status(404).json({ message: 'Employee not found' });

  employee.status = status;
  await employee.save();

  await logAudit({
    actor: req.user._id,
    action: `EMPLOYEE_STATUS_${status.toUpperCase()}`,
    module: 'Employee',
    targetId: employee._id,
  });

  res.json(employee.toSafeObject());
};

// @route POST /api/employees/:id/documents
// Access: Admin, HR, or the employee themself (uploading their own docs) — multipart/form-data
// Field: `type` (cv|experienceLetter|cnicFront|cnicBack|offerLetter|contract|certificate), file in `file`
export const uploadEmployeeDocument = async (req, res) => {
  const employee = await User.findById(req.params.id);
  if (!employee) return res.status(404).json({ message: 'Employee not found' });

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const { type } = req.body;
  const fileUrl = buildFileUrl(req, req.file); // saved to Mongo as the document's `url`

  employee.documents.push({
    type: type || 'other',
    name: req.file.originalname,
    url: fileUrl,
  });
  await employee.save();

  await logAudit({
    actor: req.user._id,
    action: 'UPLOADED_DOCUMENT',
    module: 'Employee',
    targetId: employee._id,
    details: { type, fileName: req.file.originalname },
  });

  res.status(201).json(employee.toSafeObject());
};

// @route DELETE /api/employees/:id/documents/:docId
export const deleteEmployeeDocument = async (req, res) => {
  const employee = await User.findById(req.params.id);
  if (!employee) return res.status(404).json({ message: 'Employee not found' });

  employee.documents = employee.documents.filter((d) => d._id.toString() !== req.params.docId);
  await employee.save();

  res.json(employee.toSafeObject());
};
