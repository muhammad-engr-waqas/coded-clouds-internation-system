import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Hash, 
  MessageSquare,
  Check,
  Users,
  Plus,
  Loader2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { User, Chat } from '@/src/types';
import { api } from '@/src/lib/api';

interface NewChannelModalProps {
  onClose: () => void;
  onSuccess: (newChannel: Chat) => void;
  mode?: 'Channel' | 'DirectMessage';
}

export function NewChannelModal({ onClose, onSuccess, mode = 'Channel' }: NewChannelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isDM = mode === 'DirectMessage';

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { employees: list } = await api.employees.list({ limit: '200' });
      setEmployees(list);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDM) {
      if (selectedUsers.length !== 1) return;
    } else if (!name.trim() || selectedUsers.length === 0) {
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const result = isDM
        ? await api.chat.createOrGetDM(selectedUsers[0])
        : await api.chat.createChannel(name.toLowerCase().replace(/\s+/g, '-'), description, selectedUsers);
      onSuccess(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to create conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    if (isDM) {
      setSelectedUsers([userId]);
      return;
    }
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const filteredEmployees = employees.filter(e => 
    e.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[var(--surface)] w-full max-w-md rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 text-accent rounded-xl">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight">{isDM ? 'New Direct Message' : 'Create Channel'}</h2>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Start a new conversation</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--background)] rounded-full transition-colors text-[var(--text)]/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100">{error}</div>
          )}
          <div className="space-y-4">
            {!isDM && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Channel Name *</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent" />
                <input 
                  required={!isDM}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all"
                  placeholder="e.g. engineering-team"
                />
              </div>
            </div>
            )}

            {!isDM && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Description (Optional)</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl py-2.5 px-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all min-h-[80px]"
                placeholder="What is this channel about?"
              />
            </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50 flex justify-between">
                <span>{isDM ? 'Select Person *' : 'Add Members *'}</span>
                <span className="text-accent">{selectedUsers.length} selected</span>
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text)]/30" />
                  <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl py-2 pl-10 pr-4 text-[11px] font-bold focus:outline-none"
                    placeholder="Search employees..."
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredEmployees.map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleUser(emp.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left group",
                        selectedUsers.includes(emp.id) ? "bg-accent/5" : "hover:bg-[var(--background)]"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent text-[10px] font-black shrink-0">
                        {emp.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black truncate">{emp.fullName}</p>
                        <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">{emp.role}</p>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                        selectedUsers.includes(emp.id) 
                          ? "bg-accent border-accent text-white" 
                          : "border-[var(--border-light)]"
                      )}>
                        {selectedUsers.includes(emp.id) && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[var(--background)] border border-[var(--border-light)] text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isLoading || (isDM ? selectedUsers.length !== 1 : !name.trim() || selectedUsers.length === 0)}
              className="flex-1 py-3 bg-accent text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isDM ? 'Start Conversation' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
