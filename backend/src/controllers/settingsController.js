import Settings from '../models/Settings.js';
import { buildFileUrl } from '../middleware/upload.js';

// @route GET /api/settings
// Access: Admin (also readable by others for theme/company name display if needed)
export const getSettings = async (req, res) => {
  const settings = await Settings.getSingleton();
  res.json(settings);
};

// @route PATCH /api/settings
// Access: Admin ONLY
export const updateSettings = async (req, res) => {
  const settings = await Settings.getSingleton();

  const editable = [
    'companyName',
    'companyAddress',
    'companyContactEmail',
    'defaultTheme',
    'lateCutoffTime',
    'workingDays',
    'standardWorkHours',
    'leaveTypes',
    'annualLeaveQuota',
    'excludeWeekendsFromLeaveCount',
    'notificationPrefs',
  ];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) settings[field] = req.body[field];
  });

  await settings.save();
  res.json(settings);
};

// @route POST /api/settings/logo
// Access: Admin ONLY — uploads company logo, stores its URL
export const uploadLogo = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const settings = await Settings.getSingleton();
  settings.companyLogoUrl = buildFileUrl(req, req.file);
  await settings.save();

  res.json(settings);
};
