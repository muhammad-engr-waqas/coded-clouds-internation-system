import express from 'express';
import {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  updateProjectTeam,
  updateMilestone,
} from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/rbac.js';
import { upload, setUploadFolder } from '../middleware/upload.js';
import { cache, invalidate } from '../middleware/cache.js';

const router = express.Router();

router.use(protect, isAdmin);

// Project list — cache 3 min; per-project — cache 5 min
router.get('/',    cache('projects:list', 180), getProjects);
router.post('/',   createProject,
  invalidate(['projects:list', 'report:projects'])
);

router.get('/:id',  cache((req) => `projects:${req.params.id}`, 300), getProjectById);
router.patch('/:id', updateProject,
  invalidate([(req) => `projects:${req.params.id}`, 'projects:list', 'report:projects'])
);
router.delete('/:id', deleteProject,
  invalidate([(req) => `projects:${req.params.id}`, 'projects:list', 'report:projects'])
);
router.patch('/:id/team', updateProjectTeam,
  invalidate([(req) => `projects:${req.params.id}`, 'projects:list'])
);
router.patch('/:id/milestones/:milestoneId', updateMilestone,
  invalidate([(req) => `projects:${req.params.id}`])
);

// Asset upload — also invalidates project cache
router.post('/:id/assets', setUploadFolder('projects'), upload.single('file'), async (req, res) => {
  const Project = (await import('../models/Project.js')).default;
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const { buildFileUrl } = await import('../middleware/upload.js');
  const { delCache } = await import('../config/redis.js');
  project.attachments.push(buildFileUrl(req, req.file));
  await project.save();
  await delCache(`projects:${req.params.id}`);
  res.status(201).json(project);
});

export default router;
