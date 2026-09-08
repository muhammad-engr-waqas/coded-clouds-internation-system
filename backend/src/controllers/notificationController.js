import Notification from '../models/Notification.js';

// @route GET /api/notifications
export const getMyNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.json({ notifications, unreadCount });
};

// @route PATCH /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notif) return res.status(404).json({ message: 'Notification not found' });
  res.json(notif);
};

// @route PATCH /api/notifications/read-all
export const markAllAsRead = async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  res.json({ message: 'All notifications marked as read' });
};
