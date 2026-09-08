import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Briefcase,
  ChevronRight,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Project, ProjectStatus } from '@/src/types';
import { ProjectSummaryCards } from '../components/projects/ProjectSummaryCards';
import { AddProjectModal } from '../components/projects/AddProjectModal';
import { ProjectDetail } from './ProjectDetail';
import { useAppStore } from '../store';
import { api } from '@/src/lib/api';

export function ProjectManagement() {
  const { user } = useAppStore();
  const [data, setData] = useState<{
    completed: number;
    inProgress: number;
    pending: number;
    projects: Project[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const { projects, counts } = await api.projects.list();
      setData({ projects, ...counts });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently remove this project?')) return;
    const prev = data;
    setData(prevData => prevData ? {
      ...prevData,
      projects: prevData.projects.filter(p => p.id !== id),
      completed: prevData.projects.filter(p => p.id !== id && p.status === 'Completed').length,
      inProgress: prevData.projects.filter(p => p.id !== id && p.status === 'In Progress').length,
      pending: prevData.projects.filter(p => p.id !== id && p.status === 'Pending').length,
    } : null);
    try {
      await api.projects.remove(id);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete project');
      setData(prev);
    }
  };

  const filteredProjects = data?.projects.filter(p => {
    const matchesFilter = activeFilter ? p.status === activeFilter : true;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.client.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (selectedProjectId) {
    return (
      <ProjectDetail 
        projectId={selectedProjectId} 
        onBack={() => {
          setSelectedProjectId(null);
          fetchProjects(); // Refresh data in case status changed
        }}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Projects</h1>
          <p className="text-[var(--text)]/50 text-[11px] font-bold uppercase tracking-widest mt-1">
            {isAdmin ? 'Track milestones, deliverables and project health' : 'Projects you are currently assigned to'}
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-3 px-6 py-4 bg-accent text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Project
          </button>
        )}
      </div>
      
      {/* Summary Cards */}
      {data && (
        <ProjectSummaryCards 
          completed={data.completed}
          inProgress={data.inProgress}
          pending={data.pending}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      )}

      {/* Toolbar */}
      <div className="bg-[var(--surface)] p-4 rounded-3xl border border-[var(--border-light)] shadow-sm flex flex-wrap items-center gap-4 shrink-0">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search project name or client..."
            className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-2xl py-3 pl-12 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-3 bg-[var(--background)] border border-[var(--border-light)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors">
            <Filter className="w-3.5 h-3.5" />
            Advanced Filters
          </button>
        </div>
      </div>

      {/* Projects List (Desktop Table / Mobile Cards) */}
      <div className="flex-1 min-h-0 bg-[var(--surface)] rounded-[2.5rem] border border-[var(--border-light)] shadow-sm overflow-hidden flex flex-col">
        {/* Mobile List View */}
        <div className="lg:hidden divide-y divide-[var(--border-light)] overflow-y-auto custom-scrollbar">
          {filteredProjects.map((project) => (
            <div 
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className="p-5 active:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black tracking-tight">{project.name}</h4>
                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{project.client}</p>
                  </div>
                </div>
                <span className={cn(
                  "text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest",
                  project.status === 'Completed' ? "bg-green-100 text-green-700" :
                  project.status === 'In Progress' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                )}>
                  {project.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold opacity-60">
                  <span className="uppercase tracking-widest">Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      project.status === 'Completed' ? "bg-green-500" : "bg-accent"
                    )} 
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold opacity-50">
                      {new Date(project.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                    <ChevronRight className="w-3 h-3 opacity-20" />
                    <p className="text-[10px] font-black">
                      {project.endDate ? new Date(project.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Ongoing'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project.id);
                      }}
                      className="p-2 bg-red-50 text-red-500 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProjectId(project.id);
                      }}
                      className="p-2 bg-slate-50 text-slate-400 rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredProjects.length === 0 && (
            <div className="p-20 text-center opacity-30">
              <Briefcase className="w-12 h-12 mx-auto mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">No projects found</p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-light)] bg-slate-50/50">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Project Name</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Client</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Timeline</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Progress</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {filteredProjects.map((project) => (
                <tr 
                  key={project.id} 
                  onClick={() => setSelectedProjectId(project.id)}
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black tracking-tight">{project.name}</p>
                        <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Team: {project.team.length} members</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold">{project.client}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest inline-flex",
                      project.status === 'Completed' ? "bg-green-100 text-green-700" :
                      project.status === 'In Progress' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold opacity-50">
                        {new Date(project.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                      <ChevronRight className="w-3 h-3 opacity-20" />
                      <p className="text-[10px] font-black">
                        {project.endDate ? new Date(project.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Ongoing'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 w-48">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              project.status === 'Completed' ? "bg-green-500" : "bg-accent"
                            )} 
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-black">{project.progress}%</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProjectId(project.id);
                        }}
                        className="p-2 hover:bg-white border border-transparent hover:border-[var(--border-light)] rounded-xl transition-all text-slate-400 hover:text-accent"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProjectId(project.id);
                        }}
                        className="p-2 hover:bg-white border border-transparent hover:border-[var(--border-light)] rounded-xl transition-all text-slate-400 hover:text-accent"
                        title="Edit (opens project detail)"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id);
                        }}
                        className="p-2 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <AddProjectModal 
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(newProject) => {
            fetchProjects();
            setIsAddModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
