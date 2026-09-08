import express from 'express';
import {
  getMyChannels,
  createChannel,
  createOrGetDM,
  updateChannel,
  deleteChannel,
  addMembers,
  removeMember,
  getMessages,
  sendMessage,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/rbac.js';
import { upload, setUploadFolder } from '../middleware/upload.js';
import { buildFileUrl } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.get('/channels', getMyChannels);
router.post('/channels', isAdmin, createChannel); // Admin-only channel creation
router.post('/dms', createOrGetDM); // any employee can start a DM
router.patch('/channels/:id', isAdmin, updateChannel);
router.delete('/channels/:id', isAdmin, deleteChannel);

router.post('/channels/:id/members', isAdmin, addMembers); // Admin-only add
router.delete('/channels/:id/members/:userId', isAdmin, removeMember); // Admin-only remove

router.get('/channels/:id/messages', getMessages);
router.post('/channels/:id/messages', sendMessage); // any member can chat

router.post('/upload', setUploadFolder('chat'), upload.single('file'), (req, res) => {
  res.status(201).json({ url: buildFileUrl(req, req.file), name: req.file.originalname });
});

export default router;
