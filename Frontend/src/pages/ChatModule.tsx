import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/src/store';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatWindow } from '../components/chat/ChatWindow';
import { ChannelSettings } from '../components/chat/ChannelSettings';
import { NewChannelModal } from '../components/chat/NewChannelModal';
import { Chat, User } from '@/src/types';
import { MessageSquare, Hash, Loader2 } from 'lucide-react';
import { api } from '@/src/lib/api';
import { getSocket } from '@/src/lib/socket';

export function ChatModule() {
  const { user } = useAppStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewChannelModalOpen, setIsNewChannelModalOpen] = useState(false);
  const [newModalMode, setNewModalMode] = useState<'Channel' | 'DirectMessage'>('Channel');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    fetchChats();
  }, []);

  const normalizeChat = (c: any): Chat => ({
    ...c,
    members: c.members ?? c.memberIds ?? [],
    type: c.type === 'DirectMessage' ? 'DirectMessage' : 'Channel',
    lastMessage: c.lastMessage
      ? {
          ...c.lastMessage,
          chatId: c.lastMessage.chatId ?? c.lastMessage.channelId ?? c.id,
          senderId: c.lastMessage.senderId?.id ?? c.lastMessage.senderId,
          senderName: c.lastMessage.senderId?.fullName ?? c.lastMessage.senderName ?? '',
          timestamp: c.lastMessage.timestamp ?? c.lastMessage.createdAt,
        }
      : undefined,
  });

  const fetchChats = async () => {
    setIsLoading(true);
    try {
      const data = await api.chat.channels();
      const normalized = Array.isArray(data) ? data.map(normalizeChat) : [];
      setChats(normalized);
      if (normalized.length > 0 && !activeChatId) {
        setActiveChatId(normalized[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time: as soon as a socket 'chat:join' is issued per-channel (in ChatWindow) the
  // backend already validates membership; here we just keep the channel list itself fresh
  // when channels are created/updated/deleted elsewhere.
  useEffect(() => {
    const socket = getSocket();
    const refresh = () => fetchChats();
    socket?.on('chat:channelCreated', refresh);
    socket?.on('chat:addedToChannel', refresh);
    socket?.on('chat:removedFromChannel', refresh);
    socket?.on('chat:channelUpdated', refresh);
    socket?.on('chat:channelDeleted', refresh);
    return () => {
      socket?.off('chat:channelCreated', refresh);
      socket?.off('chat:addedToChannel', refresh);
      socket?.off('chat:removedFromChannel', refresh);
      socket?.off('chat:channelUpdated', refresh);
      socket?.off('chat:channelDeleted', refresh);
    };
  }, []);

  const activeChat = chats.find(c => c.id === activeChatId) || null;
  const isAdmin = user?.role === 'Admin';

  const handleUpdateChat = (updatedChat: Chat) => {
    setChats(prev => prev.map(c => c.id === updatedChat.id ? normalizeChat(updatedChat) : c));
  };

  const handleDeleteChat = async (id: string) => {
    const prev = chats;
    setChats(prev.filter(c => c.id !== id));
    setActiveChatId(chats.find(c => c.id !== id)?.id || null);
    setIsSettingsOpen(false);
    try {
      await api.chat.deleteChannel(id);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete channel');
      setChats(prev);
    }
  };

  const handleCreateChannel = (newChannel: Chat) => {
    const normalized = normalizeChat(newChannel);
    setChats(prev => (prev.some(c => c.id === normalized.id) ? prev : [normalized, ...prev]));
    setActiveChatId(normalized.id);
    setIsNewChannelModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex-1 -m-8 flex h-[calc(100vh-64px)] overflow-hidden bg-[var(--surface)] animate-in fade-in duration-500">
      <ChatSidebar 
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        onNewChannel={() => { setNewModalMode('Channel'); setIsNewChannelModalOpen(true); }}
        onNewDM={() => { setNewModalMode('DirectMessage'); setIsNewChannelModalOpen(true); }}
        isAdmin={isAdmin}
      />

      <div className="flex-1 flex overflow-hidden">
        {activeChat && user ? (
          <>
            <ChatWindow 
              chat={activeChat}
              currentUser={user}
              onOpenSettings={() => setIsSettingsOpen(!isSettingsOpen)}
            />
            {isSettingsOpen && (
              <ChannelSettings 
                chat={activeChat}
                isAdmin={isAdmin}
                onClose={() => setIsSettingsOpen(false)}
                onUpdate={handleUpdateChat}
                onDelete={handleDeleteChat}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center p-12">
            <div className="w-20 h-20 rounded-[2.5rem] bg-accent/5 flex items-center justify-center text-accent mb-6">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black tracking-tight">Select a conversation</h3>
            <p className="text-sm font-medium mt-2 max-w-xs">
              Choose a channel or direct message from the sidebar to start chatting with your team.
            </p>
          </div>
        )}
      </div>

      {isNewChannelModalOpen && (
        <NewChannelModal 
          mode={newModalMode}
          onClose={() => setIsNewChannelModalOpen(false)}
          onSuccess={handleCreateChannel}
        />
      )}
    </div>
  );
}
