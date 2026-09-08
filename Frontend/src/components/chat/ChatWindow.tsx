import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Hash, 
  Users, 
  Settings,
  ChevronLeft,
  Loader2,
  Lock
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Chat, ChatMessage, User } from '@/src/types';
import { api } from '@/src/lib/api';
import { getSocket } from '@/src/lib/socket';

interface ChatWindowProps {
  chat: Chat;
  currentUser: User;
  onBack?: () => void;
  onOpenSettings?: () => void;
}

// The backend message document uses `channelId` / `senderId` (a populated {id, fullName,
// avatarUrl} object) / `createdAt`. Normalize once here to the flatter shape this UI expects.
function normalizeMessage(m: any): ChatMessage {
  return {
    id: m.id,
    chatId: m.channelId,
    senderId: m.senderId?.id ?? m.senderId,
    senderName: m.senderId?.fullName ?? 'Unknown',
    text: m.text,
    timestamp: m.createdAt,
  } as ChatMessage;
}

export function ChatWindow({ chat, currentUser, onBack, onOpenSettings }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAnnouncements = chat.name === 'announcements';
  const canPost = !isAnnouncements || ['Admin', 'HR'].includes(currentUser.role);

  // Load message history from the database whenever the active channel changes.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    api.chat.messages(chat.id)
      .then((data: any[]) => {
        if (!cancelled) setMessages(data.map(normalizeMessage));
      })
      .catch((err) => console.error(err))
      .finally(() => !cancelled && setIsLoading(false));
    return () => { cancelled = true; };
  }, [chat.id]);

  useEffect(() => {
    // Reuse the single app-wide authenticated socket. The backend verifies channel membership
    // server-side on 'chat:join' — a socket cannot join a room for a channel it isn't in.
    const socket = getSocket();
    socket?.emit('chat:join', chat.id);

    const onMessage = (message: any) => {
      if (message.channelId === chat.id || message.channelId?.toString() === chat.id) {
        setMessages(prev => (prev.some(m => m.id === message.id) ? prev : [...prev, normalizeMessage(message)]));
      }
    };

    const onTypingStart = (data: { chatId: string, userId: string, userName: string }) => {
      if (data.chatId === chat.id && data.userId !== currentUser.id) {
        setTypingUsers(prev => Array.from(new Set([...prev, data.userName])));
      }
    };

    const onTypingStop = (data: { chatId: string, userId: string, userName?: string }) => {
      if (data.chatId === chat.id) {
        setTypingUsers(prev => prev.filter(name => name !== data.userName));
      }
    };

    socket?.on('message:new', onMessage);
    socket?.on('typing:start', onTypingStart);
    socket?.on('typing:stop', onTypingStop);

    return () => {
      socket?.off('message:new', onMessage);
      socket?.off('typing:start', onTypingStart);
      socket?.off('typing:stop', onTypingStop);
    };
  }, [chat.id, currentUser.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !canPost || isSending) return;

    const text = newMessage;
    setNewMessage('');
    setIsSending(true);
    try {
      const sent = await api.chat.sendMessage(chat.id, text);
      // The backend also broadcasts this to the room over 'message:new' (including back to us),
      // so we don't need to append it locally — that would risk a visible duplicate.
      getSocket()?.emit('typing:stop', { chatId: chat.id, userId: currentUser.id, userName: currentUser.fullName });
    } catch (err: any) {
      alert(err?.message || 'Failed to send message');
      setNewMessage(text); // give the text back so nothing is lost
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      getSocket()?.emit('typing:start', { 
        chatId: chat.id, 
        userId: currentUser.id, 
        userName: currentUser.fullName 
      });
      setTimeout(() => {
        setIsTyping(false);
        getSocket()?.emit('typing:stop', { chatId: chat.id, userId: currentUser.id, userName: currentUser.fullName });
      }, 3000);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--background)]/50">
      {/* Window Header */}
      <div className="h-16 px-6 border-b border-[var(--border-light)] bg-[var(--surface)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-[var(--text)]/40">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              {chat.type === 'Channel' ? <Hash className="w-5 h-5" /> : <div className="text-sm font-black">{chat.name.charAt(0)}</div>}
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">{chat.name}</h3>
              <div className="flex items-center gap-2">
                 <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                  {chat.type === 'Channel' ? `${(chat.members ?? chat.memberIds ?? []).length} members` : 'Direct Message'}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-[var(--background)] rounded-xl transition-colors text-[var(--text)]/30">
            <Users className="w-4 h-4" />
          </button>
          <button 
            onClick={onOpenSettings}
            className="p-2 hover:bg-[var(--background)] rounded-xl transition-colors text-[var(--text)]/30"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center">
            <div className="w-16 h-16 rounded-3xl bg-accent/5 flex items-center justify-center text-accent mb-4">
              {chat.type === 'Channel' ? <Hash className="w-8 h-8" /> : <Users className="w-8 h-8" />}
            </div>
            <h4 className="text-sm font-black uppercase tracking-widest">Beginning of {chat.name}</h4>
            <p className="text-[10px] font-bold mt-1">This is the very beginning of your conversation.</p>
          </div>
        ) : null}

        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          return (
            <div key={msg.id} className={cn(
              "flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
              isMe ? "flex-row-reverse" : ""
            )}>
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent text-[11px] font-black shrink-0">
                {msg.senderName?.charAt(0)}
              </div>
              <div className={cn(
                "max-w-[70%] space-y-1",
                isMe ? "text-right" : ""
              )}>
                {!isMe && <p className="text-[10px] font-black opacity-30 ml-1">{msg.senderName}</p>}
                <div className={cn(
                  "p-3 rounded-2xl text-xs font-medium shadow-sm",
                  isMe 
                    ? "bg-accent text-white rounded-tr-none" 
                    : "bg-[var(--surface)] border border-[var(--border-light)] rounded-tl-none"
                )}>
                  {msg.text}
                </div>
                <p className="text-[9px] font-bold opacity-30 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-[10px] font-black opacity-30 italic">
            <div className="flex gap-1">
              <span className="w-1 h-1 bg-current rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-6 shrink-0">
        {!canPost ? (
          <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-400">
            <Lock className="w-4 h-4" />
            <p className="text-xs font-black uppercase tracking-widest">Only Admin and HR can post in this channel.</p>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="relative">
            <input 
              value={newMessage}
              onChange={handleTyping}
              className="w-full bg-[var(--surface)] border border-[var(--border-light)] rounded-2xl py-4 pl-6 pr-24 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/10 shadow-lg shadow-slate-200/50 transition-all"
              placeholder={`Message ${chat.name}...`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button type="button" className="p-2 hover:bg-[var(--background)] rounded-xl text-[var(--text)]/30 transition-colors" title="Attachments coming soon">
                <Paperclip className="w-5 h-5" />
              </button>
              <button 
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="p-2.5 bg-accent text-white rounded-xl shadow-lg shadow-accent/20 hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
