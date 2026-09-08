import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Loader2,
  Calendar,
  Users,
  Briefcase,
  DollarSign,
  Check
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { User, ProjectStatus } from '@/src/types';
import { api } from '@/src/lib/api';

interface AddProjectModalProps {
  onClose: () => void;
  onSuccess: (project: any) => void;
}

export function AddProjectModal({ onClose, onSuccess }: AddProjectModalProps) {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Pending');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

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
    if (!name.trim() || !client.trim() || !startDate) return;

    setIsLoading(true);
    setError('');
    try {
      const newProject = await api.projects.create({
        name,
        client,
        status,
        startDate,
        endDate: endDate || undefined,
        description,
        budget: budget ? parseFloat(budget) : undefined,
        team: selectedTeam,
      });
      onSuccess(newProject);
    } catch (err: any) {
      setError(err?.message || 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedTeam(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const filteredEmployees = employees.filter(e => 
    e.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[var(--surface)] w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-[var(--border)] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-[var(--border-light)] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent text-white rounded-2xl shadow-lg shadow-accent/20">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Add New Project</h2>
              <p className="text-[11px] font-bold opacity-40 uppercase tracking-widest">Create or record project history</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {error && (
            <div className="md:col-span-2 bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100">{error}</div>
          )}
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Project Name *</label>
              <input 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-sm font-bold focus:outline-none"
                placeholder="e.g. Infrastructure Modernization"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Client *</label>
              <input 
                required
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-sm font-bold focus:outline-none"
                placeholder="Client name or internal department"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Status *</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Budget</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-11 pr-5 text-xs font-bold focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Start Date *</label>
                <input 
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">End Date / Deadline</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-sm font-medium focus:outline-none min-h-[100px]"
                placeholder="Project overview and deliverables..."
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1.5">Assign Team Members</label>
            <div className="relative mb-3">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-11 pr-5 text-xs font-bold focus:outline-none"
                placeholder="Search employees..."
              />
            </div>
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-3xl overflow-y-auto p-2 space-y-1 max-h-[400px] custom-scrollbar">
              {filteredEmployees.map(emp => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => toggleMember(emp.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left group",
                    selectedTeam.includes(emp.id) ? "bg-accent text-white shadow-lg shadow-accent/20" : "hover:bg-white"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0",
                    selectedTeam.includes(emp.id) ? "bg-white/20" : "bg-accent/10 text-accent"
                  )}>
                    {emp.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black truncate">{emp.fullName}</p>
                    <p className={cn(
                      "text-[9px] font-bold uppercase tracking-widest",
                      selectedTeam.includes(emp.id) ? "text-white/60" : "opacity-30"
                    )}>{emp.role}</p>
                  </div>
                  {selectedTeam.includes(emp.id) && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-50 border border-slate-100 text-[12px] font-black uppercase tracking-widest rounded-2xl"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isLoading || !name.trim() || !client.trim() || !startDate}
              className="flex-2 py-4 bg-accent text-white text-[12px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-accent/20 transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
