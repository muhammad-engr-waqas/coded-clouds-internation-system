import jwt from 'jsonwebtoken';
import Channel from '../models/Channel.js';

/**
 * Initializes Socket.io: authenticates the connection via JWT (same token as REST API),
 * and joins the socket to a personal room `user:<id>` so we can target notifications/events
 * directly at one user (e.g. task assigned, leave status changed, chat message).
 *
 * Frontend usage:
 *   const socket = io(API_URL, { auth: { token: <jwt> } });
 */
export const initSockets = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token provided'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    io.emit('presence:update', { userId: socket.userId, online: true });

    // Join a chat channel room to receive typing indicators / live messages.
    // Must verify membership server-side — otherwise any authenticated socket
    // could join any channel:<id> room and read live messages it has no REST access to.
    socket.on('chat:join', async (channelId) => {
      try {
        const channel = await Channel.findById(channelId);
        const isMember = channel?.memberIds?.some((id) => id.toString() === socket.userId);
        if (!isMember) return; // silently ignore — do not leak channel existence
        socket.join(`channel:${channelId}`);
      } catch {
        // invalid id etc. — ignore
      }
    });
    socket.on('chat:leave', (channelId) => {
      socket.leave(`channel:${channelId}`);
    });
    socket.on('chat:typing:start', (channelId) => {
      socket.to(`channel:${channelId}`).emit('typing:start', { userId: socket.userId, channelId });
    });
    socket.on('chat:typing:stop', (channelId) => {
      socket.to(`channel:${channelId}`).emit('typing:stop', { userId: socket.userId, channelId });
    });

    socket.on('disconnect', () => {
      io.emit('presence:update', { userId: socket.userId, online: false });
    });
  });
};

/*
Event reference (emitted by controllers via req.app.get('io')):
  - task:assigned          -> to user:<assignedTo>            (new task appears on employee panel)
  - task:report:new        -> to user:<taskCreator> + channel used by task detail viewers
  - task:status:changed    -> to relevant users
  - attendance:update      -> broadcast to Admin/HR (live check-in/out on their table)
  - leave:new              -> to Admin/HR
  - leave:statusChanged    -> to user:<employee>
  - message:new            -> to channel:<channelId>
  - notification:new       -> to user:<id>  (see utils/notify.js)
*/
