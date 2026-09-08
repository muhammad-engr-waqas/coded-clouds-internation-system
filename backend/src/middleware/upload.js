import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = process.env.UPLOAD_DIR || 'uploads';

// Ensure uploads dir + subfolders exist
['documents', 'avatars', 'chat', 'tasks', 'projects', 'leave', 'logo'].forEach((sub) => {
  const dir = path.join(process.cwd(), uploadDir, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // route sets req.uploadSubfolder before calling multer, default = documents
    const sub = req.uploadSubfolder || 'documents';
    cb(null, path.join(process.cwd(), uploadDir, sub));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${safeBase}-${uniqueSuffix}${ext}`);
  },
});

const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExt.includes(ext)) {
    return cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowedExt.join(', ')}`));
  }
  cb(null, true);
};

const maxSizeMB = Number(process.env.MAX_FILE_SIZE_MB || 10);

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
});

// Helper to set which subfolder a route uploads into, e.g. router.post('/', setUploadFolder('avatars'), upload.single('file'), ...)
export const setUploadFolder = (folder) => (req, res, next) => {
  req.uploadSubfolder = folder;
  next();
};

// Builds a public URL/path for a saved file, stored in Mongo as the "url"
export const buildFileUrl = (req, file) => {
  const sub = req.uploadSubfolder || 'documents';
  return `/uploads/${sub}/${file.filename}`;
};
