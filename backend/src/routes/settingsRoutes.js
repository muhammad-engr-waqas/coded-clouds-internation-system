import express from 'express';
import { getSettings, updateSettings, uploadLogo } from '../controllers/settingsController.js';
import { getRoles, createRole, updateRole, deleteRole } from '../controllers/roleController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/rbac.js';
import { upload, setUploadFolder } from '../middleware/upload.js';
import { cache, invalidate } from '../middleware/cache.js';

const router = express.Router();

router.use(protect);

// Settings — cache 10 min; invalidate on any write
router.get('/',    cache('settings:singleton', 600), getSettings);
router.patch('/',  isAdmin, updateSettings,  invalidate(['settings:singleton']));
router.post('/logo', isAdmin, setUploadFolder('logo'), upload.single('file'), uploadLogo,
  invalidate(['settings:singleton'])
);

// Roles — cache 10 min; invalidate on any role write
router.get('/roles/all', cache('roles:all', 600), getRoles);
router.post('/roles',       isAdmin, createRole, invalidate(['roles:all']));
router.patch('/roles/:id',  isAdmin, updateRole, invalidate(['roles:all']));
router.delete('/roles/:id', isAdmin, deleteRole, invalidate(['roles:all']));

export default router;
