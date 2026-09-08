import Notification from '../models/Notification.js';

/**
 * Creates a notification in DB and pushes it live via socket.io if the io instance is available.
 */
export const notifyUser = async (io, userId, { type, title, message = '', link = '' }) => {
  const notif = await Notification.create({ userId, type, title, message, link });
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', notif);
  }
  return notif;
};
