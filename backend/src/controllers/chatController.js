import Channel from '../models/Channel.js';
import Message from '../models/Message.js';

// @route GET /api/chat/channels
// Access: any logged-in user — only returns channels/DMs they are a member of
export const getMyChannels = async (req, res) => {
  const channels = await Channel.find({ memberIds: req.user._id, isArchived: false })
    .populate('memberIds', 'fullName avatarUrl role')
    .sort({ updatedAt: -1 });

  // attach last message + unread count per channel
  const result = await Promise.all(
    channels.map(async (ch) => {
      const lastMessage = await Message.findOne({ channelId: ch._id }).sort({ createdAt: -1 });
      const unreadCount = await Message.countDocuments({
        channelId: ch._id,
        readBy: { $ne: req.user._id },
        senderId: { $ne: req.user._id },
      });
      return { ...ch.toObject(), lastMessage, unreadCount };
    })
  );

  res.json(result);
};

// @route POST /api/chat/channels
// Access: Admin ONLY — creates a channel with initial members
export const createChannel = async (req, res) => {
  const { name, description, members } = req.body;
  if (!name || !members || members.length === 0) {
    return res.status(400).json({ message: 'Channel name and at least one member are required' });
  }

  const memberIds = Array.from(new Set([...members, req.user._id.toString()]));

  const channel = await Channel.create({
    name,
    description,
    type: 'Channel',
    memberIds,
    createdBy: req.user._id,
  });

  const io = req.app.get('io');
  memberIds.forEach((id) => io.to(`user:${id}`).emit('chat:channelCreated', channel));

  res.status(201).json(channel);
};

// @route POST /api/chat/dms
// Access: any employee — start a 1:1 DM with a colleague (no membership management needed)
export const createOrGetDM = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId is required' });

  let dm = await Channel.findOne({
    type: 'DirectMessage',
    memberIds: { $all: [req.user._id, userId], $size: 2 },
  });

  if (!dm) {
    dm = await Channel.create({
      name: 'Direct Message',
      type: 'DirectMessage',
      memberIds: [req.user._id, userId],
      createdBy: req.user._id,
    });
  }

  res.status(201).json(dm);
};

// @route PATCH /api/chat/channels/:id
// Access: Admin ONLY — rename/edit description/archive
export const updateChannel = async (req, res) => {
  const channel = await Channel.findById(req.params.id);
  if (!channel) return res.status(404).json({ message: 'Channel not found' });

  const { name, description, isArchived } = req.body;
  if (name !== undefined) channel.name = name;
  if (description !== undefined) channel.description = description;
  if (isArchived !== undefined) channel.isArchived = isArchived;
  await channel.save();

  const io = req.app.get('io');
  channel.memberIds.forEach((id) => io.to(`user:${id}`).emit('chat:channelUpdated', channel));

  res.json(channel);
};

// @route DELETE /api/chat/channels/:id
// Access: Admin ONLY
export const deleteChannel = async (req, res) => {
  const channel = await Channel.findById(req.params.id);
  if (!channel) return res.status(404).json({ message: 'Channel not found' });

  await Message.deleteMany({ channelId: channel._id });
  await channel.deleteOne();

  const io = req.app.get('io');
  channel.memberIds.forEach((id) => io.to(`user:${id}`).emit('chat:channelDeleted', { channelId: channel._id }));

  res.json({ message: 'Channel deleted' });
};

// @route POST /api/chat/channels/:id/members
// Access: Admin ONLY — add member(s)
export const addMembers = async (req, res) => {
  const { memberIds } = req.body; // array of userIds to add
  const channel = await Channel.findById(req.params.id);
  if (!channel) return res.status(404).json({ message: 'Channel not found' });

  channel.memberIds = Array.from(new Set([...channel.memberIds.map(String), ...memberIds]));
  await channel.save();

  const io = req.app.get('io');
  memberIds.forEach((id) => io.to(`user:${id}`).emit('chat:addedToChannel', channel));

  res.json(channel);
};

// @route DELETE /api/chat/channels/:id/members/:userId
// Access: Admin ONLY — remove member
export const removeMember = async (req, res) => {
  const channel = await Channel.findById(req.params.id);
  if (!channel) return res.status(404).json({ message: 'Channel not found' });

  channel.memberIds = channel.memberIds.filter((id) => id.toString() !== req.params.userId);
  await channel.save();

  const io = req.app.get('io');
  io.to(`user:${req.params.userId}`).emit('chat:removedFromChannel', { channelId: channel._id });

  res.json(channel);
};

// @route GET /api/chat/channels/:id/messages
export const getMessages = async (req, res) => {
  const channel = await Channel.findById(req.params.id);
  if (!channel) return res.status(404).json({ message: 'Channel not found' });

  const isMember = channel.memberIds.some((id) => id.toString() === req.user._id.toString());
  if (!isMember) return res.status(403).json({ message: 'You are not a member of this channel' });

  const messages = await Message.find({ channelId: channel._id })
    .populate('senderId', 'fullName avatarUrl')
    .sort({ createdAt: 1 });

  res.json(messages);
};

// @route POST /api/chat/channels/:id/messages
// Access: any member of the channel — EXCEPT the #announcements channel, which is Admin/HR-only for posting
export const sendMessage = async (req, res) => {
  const channel = await Channel.findById(req.params.id);
  if (!channel) return res.status(404).json({ message: 'Channel not found' });

  const isMember = channel.memberIds.some((id) => id.toString() === req.user._id.toString());
  if (!isMember) return res.status(403).json({ message: 'You are not a member of this channel' });

  if (channel.isAnnouncements && !['Admin', 'HR'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Only Admin and HR can post in this channel' });
  }

  const { text, attachments } = req.body;
  if (!text && (!attachments || attachments.length === 0)) {
    return res.status(400).json({ message: 'Message text or attachment required' });
  }

  const message = await Message.create({
    channelId: channel._id,
    senderId: req.user._id,
    text,
    attachments: attachments || [],
    readBy: [req.user._id],
  });
  const populated = await message.populate('senderId', 'fullName avatarUrl');

  channel.updatedAt = new Date();
  await channel.save();

  const io = req.app.get('io');
  io.to(`channel:${channel._id}`).emit('message:new', populated);
  channel.memberIds.forEach((id) => {
    if (id.toString() !== req.user._id.toString()) {
      io.to(`user:${id}`).emit('notification:new', {
        type: 'CHAT_MESSAGE',
        title: `New message in ${channel.name}`,
        message: text,
      });
    }
  });

  res.status(201).json(populated);
};
