import React, { useState } from 'react';
import { 
  Hash, 
  MessageCircle, 
  Plus, 
  Search, 
  Settings,
  MoreVertical,
  Bell,
  Clock
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Chat } from '@/src/types';

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChannel: () => void;
  onNewDM: () => void;
  isAdmin: boolean;
}

export function ChatSidebar({ chats, activeChatId, onSelectChat, onNewChannel, onNewDM, isAdmin }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const channels = chats.filter(c => c.type === 'Channel');
  const dms = chats.filter(c => c.type === 'DirectMessage');

  return (
    <div className="w-80 border-r border-[var(--border-light)] bg-[var(--surface)] flex flex-col h-full overflow-hidden shrink-0">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-[var(--border-light)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black tracking-tight">Messages</h2>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-[var(--background)] rounded-xl transition-colors text-[var(--text)]/40">
              <Bell className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-[var(--background)] rounded-xl transition-colors text-[var(--text)]/40">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl py-2 pl-10 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all"
            placeholder="Search messages..."
          />
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Channels Section */}
        <div>
          <div className="flex items-center justify-between mb-2 px-2">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Channels</p>
            {isAdmin && (
              <button 
                onClick={onNewChannel}
                className="p-1 hover:bg-accent/10 text-accent rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onSelectChat(channel.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                  activeChatId === channel.id 
                    ? "bg-accent text-white shadow-lg shadow-accent/20" 
                    : "hover:bg-[var(--background)] text-[var(--text)]/70 hover:text-[var(--text)]"
                )}
              >
                <Hash className={cn(
                  "w-4 h-4 shrink-0",
                  activeChatId === channel.id ? "text-white" : "text-accent"
                )} />
                <div className="flex-1 text-left truncate">
                  <p className="text-xs font-bold truncate">{channel.name}</p>
                </div>
                {channel.unreadCount && channel.unreadCount > 0 && (
                  <span className={cn(
                    "text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                    activeChatId === channel.id ? "bg-white text-accent" : "bg-accent text-white"
                  )}>
                    {channel.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div>
          <div className="flex items-center justify-between mb-2 px-2">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Direct Messages</p>
            <button 
              onClick={onNewDM}
              className="p-1 hover:bg-accent/10 text-accent rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            {dms.map((dm) => (
              <button
                key={dm.id}
                onClick={() => onSelectChat(dm.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                  activeChatId === dm.id 
                    ? "bg-accent text-white shadow-lg shadow-accent/20" 
                    : "hover:bg-[var(--background)] text-[var(--text)]/70 hover:text-[var(--text)]"
                )}
              >
                <div className="relative w-8 h-8 shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-[10px] font-black">
                    {dm.name.charAt(0)}
                  </div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-[var(--surface)] rounded-full"></div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-bold truncate">{dm.name}</p>
                  <p className={cn(
                    "text-[9px] truncate",
                    activeChatId === dm.id ? "text-white/60" : "opacity-40"
                  )}>
                    {dm.lastMessage?.text || 'No messages yet'}
                  </p>
                </div>
                {dm.unreadCount && dm.unreadCount > 0 && (
                  <span className={cn(
                    "text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                    activeChatId === dm.id ? "bg-white text-accent" : "bg-accent text-white"
                  )}>
                    {dm.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
