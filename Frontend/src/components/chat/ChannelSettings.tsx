import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  UserMinus, 
  Trash2, 
  Archive, 
  Edit3, 
  Check, 
  Search,
  Loader2,
  Shield,
  Plus
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Chat, User } from '@/src/types';
import { api } from '@/src/lib/api';

interface ChannelSettingsProps {
  chat: Chat;
  onClose: () => void;
  onUpdate: (updated: Chat) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}

export function ChannelSettings({ chat, onClose, onUpdate, onDelete, isAdmin }: ChannelSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(chat.name);
  const [description, setDescription] = useState(chat.description || '');
  const [members, setMembers] = useState<User[]>([]);
  const [allEmployees, setAllEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMembers();
    if (isAdmin) fetchAllEmployees();
  }, [chat.id]);

  const fetchMembers = async () => {
    try {
      const { employees } = await api.employees.list({ limit: '200' });
      setMembers(employees.filter((u: User) => chat.members.includes(u.id)));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      const { employees } = await api.employees.list({ limit: '200' });
      setAllEmployees(employees);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updated = await api.chat.updateChannel(chat.id, { name, description });
      onUpdate({ ...chat, name: updated.name, description: updated.description });
      setIsEditing(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to save channel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await api.chat.addMembers(chat.id, [userId]);
      const newMember = allEmployees.find(e => e.id === userId);
      if (newMember) {
        setMembers([...members, newMember]);
        onUpdate({ ...chat, members: [...chat.members, userId] });
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await api.chat.removeMember(chat.id, userId);
      setMembers(members.filter(m => m.id !== userId));
      onUpdate({ ...chat, members: chat.members.filter(id => id !== userId) });
    } catch (err: any) {
      alert(err?.message || 'Failed to remove member');
    }
  };

  const filteredEmployees = allEmployees.filter(e => 
    !chat.members.includes(e.id) && 
    e.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 border-l border-[var(--border-light)] bg-[var(--surface)] flex flex-col h-full overflow-hidden shrink-0 animate-in slide-in-from-right-4 duration-300">
      <div className="h-16 px-6 border-b border-[var(--border-light)] flex items-center justify-between shrink-0">
        <h3 className="text-sm font-black uppercase tracking-widest">Channel Info</h3>
        <button onClick={onClose} className="p-2 hover:bg-[var(--background)] rounded-xl text-[var(--text)]/40 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-30">About</p>
            {isAdmin && !isEditing && (
              <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-accent/10 text-accent rounded-md transition-colors">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-3">
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                placeholder="Channel Name"
              />
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none min-h-[80px]"
                placeholder="Description"
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 py-2 bg-accent text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 bg-[var(--background)] border border-[var(--border-light)] rounded-lg text-[10px] font-black uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-black">#{chat.name}</h4>
              <p className="text-[11px] font-medium opacity-50 leading-relaxed">
                {chat.description || 'No description provided.'}
              </p>
            </div>
          )}
        </div>

        {/* Members List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Members • {members.length}</p>
            {isAdmin && (
              <button 
                onClick={() => setShowAddMember(!showAddMember)}
                className="p-1 hover:bg-accent/10 text-accent rounded-md transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {showAddMember && isAdmin && (
            <div className="p-3 bg-[var(--background)]/50 rounded-2xl border border-[var(--border-light)] space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text)]/30" />
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border-light)] rounded-lg py-1.5 pl-7 pr-3 text-[10px] font-bold focus:outline-none"
                  placeholder="Search employees..."
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                {filteredEmployees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => handleAddMember(emp.id)}
                    className="w-full flex items-center gap-2 p-1.5 hover:bg-accent/10 rounded-lg transition-all text-left"
                  >
                    <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center text-accent text-[8px] font-black">
                      {emp.fullName.charAt(0)}
                    </div>
                    <p className="text-[10px] font-bold truncate">{emp.fullName}</p>
                    <Plus className="w-3 h-3 ml-auto text-accent opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {members.map(member => (
              <div key={member.id} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent text-[10px] font-black relative shrink-0">
                  {member.fullName.charAt(0)}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[var(--surface)] rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-black truncate">{member.fullName}</p>
                    {member.role === 'Admin' && <Shield className="w-2.5 h-2.5 text-accent" />}
                  </div>
                  <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">{member.role}</p>
                </div>
                {isAdmin && member.id !== chat.createdBy && (
                  <button 
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        {isAdmin && (
          <div className="pt-6 border-t border-[var(--border-light)] space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Danger Zone</p>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-100 transition-colors">
              <Archive className="w-3.5 h-3.5" />
              Archive Channel
            </button>
            <button 
              onClick={() => {
                if (confirm(`Permanently delete #${chat.name}? This cannot be undone.`)) {
                  onDelete(chat.id);
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Channel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
