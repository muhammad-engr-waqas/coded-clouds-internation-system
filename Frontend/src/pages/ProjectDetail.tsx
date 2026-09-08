import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Edit2,
  Trash2,
  Calendar,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Paperclip,
  ChevronRight,
  Loader2,
  Download,
  Trash,
  X,
  Save
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Project, ProjectStatus, User } from '@/src/types';
import { api } from '@/src/lib/api';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  isAdmin: boolean;
}

export function ProjectDetail({ projectId, onBack, isAdmin }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Milestones' | 'Team' | 'Assets'>('Overview');
  const [isLoading, setIsLoading] = useState(true);

  // Team tab: resolved employee profiles keyed by userId
  const [teamMembers, setTeamMembers] = useState<Record<string, User>>({});

  // Edit project modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', client: '', description: '', budget: 0, endDate: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Add milestone modal state
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', dueDate: '' });
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    setIsLoading(true);
    try {
      const data = await api.projects.get(projectId);
      setProject(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Resolve team member IDs → full profiles when Team tab opens
  useEffect(() => {
    if (activeTab !== 'Team' || !project) return;
    const teamIds: string[] = project.team ?? project.teamMemberIds ?? [];
    const unresolved = teamIds.filter(id => !teamMembers[id]);
    if (unresolved.length === 0) return;

    Promise.allSettled(unresolved.map(id => api.employees.get(id))).then(results => {
      const resolved: Record<string, User> = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') resolved[unresolved[i]] = r.value;
      });
      setTeamMembers(prev => ({ ...prev, ...resolved }));
    });
  }, [activeTab, project]);

  const updateStatus = async (newStatus: ProjectStatus) => {
    if (!project) return;
    const prev = project;
    setProject({ ...project, status: newStatus });
    try {
      const updated = await api.projects.update(projectId, { status: newStatus });
      setProject(updated);
    } catch (err: any) {
      alert(err?.message || 'Failed to update project status');
      setProject(prev);
    }
  };

  const handleEditOpen = () => {
    if (!project) return;
    setEditForm({
      name: project.name,
      client: project.client,
      description: project.description || '',
      budget: project.budget || 0,
      endDate: project.endDate ? project.endDate.slice(0, 10) : '',
    });
    setIsEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!project) return;
    setIsSaving(true);
    try {
      const updated = await api.projects.update(projectId, {
        name: editForm.name,
        client: editForm.client,
        description: editForm.description,
        budget: Number(editForm.budget),
        endDate: editForm.endDate || undefined,
      });
      setProject(updated);
      setIsEditOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to update project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    try {
      await api.projects.remove(projectId);
      onBack();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete project');
    }
  };

  const handleAddMilestone = async () => {
    if (!milestoneForm.title.trim() || !milestoneForm.dueDate) {
      alert('Title and due date are required');
      return;
    }
    setIsAddingMilestone(true);
    try {
      const updated = await api.projects.update(projectId, {
        milestones: [
          ...(project?.milestones || []),
          { title: milestoneForm.title.trim(), dueDate: milestoneForm.dueDate, isDone: false },
        ],
      });
      setProject(updated);
      setMilestoneForm({ title: '', dueDate: '' });
      setIsAddMilestoneOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to add milestone');
    } finally {
      setIsAddingMilestone(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!project) return;
    const updated_milestones = (project.milestones || []).filter((m: any) => m.id !== milestoneId);
    const prev = project;
    setProject({ ...project, milestones: updated_milestones });
    try {
      const updated = await api.projects.update(projectId, { milestones: updated_milestones });
      setProject(updated);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete milestone');
      setProject(prev);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
        <AlertCircle className="w-16 h-16 mb-4" />
        <h2 className="text-xl font-black uppercase tracking-widest">Project Not Found</h2>
        <button onClick={onBack} className="mt-4 text-accent font-bold flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">
      {/* Edit Project Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight">Edit Project</h2>
              <button onClick={() => setIsEditOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Project Name</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Client</label>
                <input value={editForm.client} onChange={e => setEditForm(f => ({ ...f, client: e.target.value }))} className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Description</label>
                <textarea rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Budget (PKR)</label>
                  <input type="number" value={editForm.budget} onChange={e => setEditForm(f => ({ ...f, budget: Number(e.target.value) }))} className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40">End Date</label>
                  <input type="date" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/20" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setIsEditOpen(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest">Cancel</button>
              <button onClick={handleEditSave} disabled={isSaving} className="px-5 py-2.5 bg-accent text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-60">
                <Save className="w-3.5 h-3.5" />{isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {isAddMilestoneOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight">Add Milestone</h2>
              <button onClick={() => setIsAddMilestoneOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Milestone Title</label>
                <input value={milestoneForm.title} onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Beta Release" className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Due Date</label>
                <input type="date" value={milestoneForm.dueDate} onChange={e => setMilestoneForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/20" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setIsAddMilestoneOpen(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest">Cancel</button>
              <button onClick={handleAddMilestone} disabled={isAddingMilestone} className="px-5 py-2.5 bg-accent text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-60">
                <Plus className="w-3.5 h-3.5" />{isAddingMilestone ? 'Adding…' : 'Add Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-3 bg-[var(--surface)] border border-[var(--border-light)] rounded-2xl hover:scale-110 transition-all text-slate-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-black tracking-tighter">{project.name}</h1>
              <div className="relative group">
                <button className={cn(
                  "text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest flex items-center gap-2 transition-all",
                  project.status === 'Completed' ? "bg-green-100 text-green-700" :
                  project.status === 'In Progress' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                )}>
                  {project.status}
                </button>
                {isAdmin && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 hidden group-hover:block z-10 w-48">
                    {(['Pending', 'In Progress', 'Completed'] as ProjectStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(s)}
                        className="w-full text-left p-3 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-[var(--text)]/50 text-[11px] font-bold uppercase tracking-widest mt-1">Client: {project.client}</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleEditOpen}
              className="p-4 bg-[var(--surface)] border border-[var(--border-light)] rounded-2xl text-slate-400 hover:text-accent transition-all"
              title="Edit Project"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-4 bg-[var(--surface)] border border-red-100 text-red-400 hover:bg-red-50 transition-all rounded-2xl"
              title="Delete Project"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-[var(--surface)] border border-[var(--border-light)] rounded-3xl self-start shrink-0">
        {(['Overview', 'Milestones', 'Team', 'Assets'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-slate-400 hover:text-accent hover:bg-slate-50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 bg-[var(--surface)] rounded-[2.5rem] border border-[var(--border-light)] shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">Description</h3>
                  <p className="text-sm font-medium leading-relaxed opacity-70 whitespace-pre-wrap">
                    {project.description || 'No description provided for this project.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">Start Date</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-accent" />
                      <p className="text-sm font-black">{new Date(project.startDate).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30">End Date</h3>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-accent" />
                      <p className="text-sm font-black">{project.endDate ? new Date(project.endDate).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : 'Ongoing'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-8">
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                  <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-4">Project Health</h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                        <span>Overall Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full transition-all duration-1000" style={{ width: `${project.progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Milestones' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-widest">Project Milestones</h3>
                {isAdmin && (
                  <button
                    onClick={() => setIsAddMilestoneOpen(true)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent hover:underline"
                  >
                    <Plus className="w-4 h-4" /> Add Milestone
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {(project.milestones || []).map((m: any, idx) => (
                  <div key={m.id || idx} className="flex items-center gap-6 p-6 bg-slate-50 border border-slate-100 rounded-3xl group">
                    <button
                      disabled={!isAdmin}
                      onClick={async () => {
                        if (!isAdmin) return;
                        const prev = project;
                        const updatedMilestones = project.milestones.map((mm: any) => mm.id === m.id ? { ...mm, isDone: !mm.isDone } : mm);
                        setProject({ ...project, milestones: updatedMilestones });
                        try {
                          const updated = await api.projects.updateMilestone(projectId, m.id, { isDone: !m.isDone });
                          setProject(updated);
                        } catch (err: any) {
                          alert(err?.message || 'Failed to update milestone');
                          setProject(prev);
                        }
                      }}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                        m.isDone ? "bg-green-500 text-white shadow-lg shadow-green-200" : "bg-white border border-slate-200 text-slate-300 group-hover:border-accent group-hover:text-accent"
                      )}
                    >
                      {m.isDone ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-black">{m.title}</p>
                      <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mt-1">Due: {new Date(m.dueDate).toLocaleDateString()}</p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteMilestone(m.id)}
                        className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400"
                        title="Delete milestone"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {(!project.milestones || project.milestones.length === 0) && (
                  <div className="py-20 text-center opacity-20">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest">No milestones defined</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Team' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-widest">Assigned Team Members</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(project.team ?? project.teamMemberIds ?? []).map((userId: string) => {
                  const member = teamMembers[userId];
                  return (
                    <div key={userId} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center font-black text-lg shrink-0">
                        {member ? member.fullName.charAt(0) : '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black truncate">{member ? member.fullName : 'Loading…'}</p>
                        <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest truncate">{member ? member.role : ''}</p>
                        {member?.designation && (
                          <p className="text-[9px] font-bold opacity-20 truncate">{member.designation}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(project.team ?? project.teamMemberIds ?? []).length === 0 && (
                  <div className="md:col-span-3 py-20 text-center opacity-20">
                    <Users className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest">No team members assigned</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Assets' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-widest">Project Assets & Deliverables</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(project.attachments || []).map((file, idx) => (
                  <div key={idx} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-accent">
                        <Paperclip className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black truncate">{file}</p>
                        <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Attachment</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-accent transition-all"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
                {(!project.attachments || project.attachments.length === 0) && (
                  <div className="md:col-span-2 py-20 text-center opacity-20">
                    <Paperclip className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest">No assets uploaded yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
