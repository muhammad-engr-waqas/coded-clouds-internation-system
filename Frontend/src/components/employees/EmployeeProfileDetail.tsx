import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Shield, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Download,
  Trash2,
  Lock,
  History,
  DollarSign
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { User } from '@/src/types';
import { api, fileUrl } from '@/src/lib/api';

interface EmployeeProfileDetailProps {
  employee: User;
  onClose: () => void;
  onUpdate: (updated: User) => void;
  onDelete: (id: string) => void;
}

type TabType = 'Overview' | 'Documents' | 'Attendance' | 'Tasks' | 'Payroll' | 'Audit Log';

export function EmployeeProfileDetail({ employee, onClose, onUpdate, onDelete }: EmployeeProfileDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>('Overview');

  const tabs: TabType[] = ['Overview', 'Documents', 'Attendance', 'Tasks', 'Payroll', 'Audit Log'];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[var(--surface)] w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl border border-[var(--border)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header / Banner */}
        <div className="h-32 bg-accent/10 relative shrink-0">
          <div className="absolute -bottom-12 left-8 flex items-end gap-6">
            <div className="w-24 h-24 rounded-2xl bg-[var(--surface)] border-4 border-[var(--surface)] shadow-lg flex items-center justify-center text-accent text-3xl font-black">
              {employee.fullName.charAt(0)}
            </div>
            <div className="mb-2">
              <h2 className="text-xl font-black tracking-tight">{employee.fullName}</h2>
              <p className="text-xs font-bold opacity-40 uppercase tracking-widest">{employee.role} • {employee.department}</p>
            </div>
          </div>
          <div className="absolute top-4 right-4 flex items-center gap-2">
             <span className={cn(
                "text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest",
                employee.status === 'Active' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
              )}>
                {employee.status}
              </span>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-full transition-colors text-[var(--text)]/40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-14 px-8 border-b border-[var(--border-light)] shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "py-4 text-[11px] font-black uppercase tracking-widest transition-all relative",
                  activeTab === tab ? "text-accent" : "text-[var(--text)]/40 hover:text-[var(--text)]"
                )}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-500">
              <div className="md:col-span-2 space-y-8">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest opacity-40 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4 p-4 bg-[var(--background)]/30 rounded-2xl border border-[var(--border-light)]">
                      <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase opacity-40">Email</p>
                        <p className="text-xs font-bold">{employee.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-[var(--background)]/30 rounded-2xl border border-[var(--border-light)]">
                      <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase opacity-40">Phone</p>
                        <p className="text-xs font-bold">{employee.phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest opacity-40 mb-4">Employee Status</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4 p-4 bg-[var(--background)]/30 rounded-2xl border border-[var(--border-light)]">
                      <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase opacity-40">Joined On</p>
                        <p className="text-xs font-bold">{employee.joiningDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-[var(--background)]/30 rounded-2xl border border-[var(--border-light)]">
                      <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase opacity-40">Designation</p>
                        <p className="text-xs font-bold">{employee.designation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-red-50/50 border border-red-100 p-6 rounded-3xl">
                  <h3 className="text-xs font-black uppercase tracking-widest text-red-600 mb-4 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Danger Zone
                  </h3>
                  <p className="text-[10px] text-red-600/70 font-bold leading-relaxed mb-4">
                    Deleting this employee will permanently remove their records from the system. This action cannot be undone.
                  </p>
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this employee?')) {
                        onDelete(employee.id);
                      }
                    }}
                    className="w-full py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200"
                  >
                    Delete Employee
                  </button>
                </div>

                <div className="bg-[var(--background)]/50 border border-[var(--border-light)] p-6 rounded-3xl">
                   <h3 className="text-xs font-black uppercase tracking-widest opacity-40 mb-4 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Security
                  </h3>
                  <button className="w-full py-2.5 bg-[var(--surface)] border border-[var(--border)] text-[10px] font-black uppercase tracking-widest rounded-xl">
                    Reset Password
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Payroll' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest opacity-40">Financial Overview</h3>
                <span className="text-[9px] font-black text-accent bg-accent/5 px-2 py-0.5 rounded uppercase tracking-widest">Confidential</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-accent text-white p-6 rounded-3xl shadow-xl shadow-accent/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <DollarSign className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Basic Salary</p>
                    <p className="text-2xl font-black mt-1">PKR {employee.basicSalary?.toLocaleString() || '0'}</p>
                    <p className="text-[9px] text-white/40 mt-4 font-bold uppercase tracking-tighter">Last updated on Aug 1, 2026 by Admin</p>
                 </div>

                 <div className="md:col-span-2 bg-[var(--background)]/30 border border-[var(--border-light)] p-6 rounded-3xl">
                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4">Recent Payments</h4>
                    <div className="space-y-3">
                      {[
                        { month: 'July 2026', amount: 85000, status: 'Paid', date: 'Aug 5, 2026' },
                        { month: 'June 2026', amount: 85000, status: 'Paid', date: 'July 5, 2026' },
                      ].map((pay, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-[var(--surface)] border border-[var(--border-light)] rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-500">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[11px] font-bold">{pay.month}</p>
                              <p className="text-[9px] opacity-40 font-black uppercase tracking-tighter">Paid via Bank Transfer</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black">PKR {pay.amount.toLocaleString()}</p>
                            <p className="text-[9px] opacity-40 font-bold">{pay.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'Documents' && (
            <div className="space-y-4 animate-in fade-in duration-500">
              {(!employee.documents || employee.documents.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                  <FileText className="w-12 h-12 mb-4" />
                  <p className="text-sm font-black uppercase tracking-widest">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {employee.documents.map((doc: any) => (
                    <div key={doc.id || doc._id} className="p-4 bg-[var(--background)]/30 border border-[var(--border-light)] rounded-2xl flex items-center justify-between group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-accent/5 flex items-center justify-center text-accent">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{doc.name}</p>
                          <p className="text-[9px] opacity-40 font-black uppercase tracking-widest">{doc.type}</p>
                        </div>
                      </div>
                      <a
                        href={fileUrl(doc.url)}
                        target="_blank"
                        rel="noreferrer"
                        download={doc.name}
                        className="p-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent hover:text-white rounded-lg ml-2"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Audit Log' && (
            <div className="space-y-4 animate-in fade-in duration-500">
              {[
                { action: 'Updated Basic Salary', user: 'Admin', time: '2 days ago', detail: 'Changed from 80k to 85k' },
                { action: 'Updated Profile', user: 'HR', time: '1 week ago', detail: 'Changed role designation' },
                { action: 'Added Document', user: 'HR', time: '2 weeks ago', detail: 'Uploaded CNIC Back' },
              ].map((log, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-accent mt-1.5"></div>
                    <div className="w-0.5 flex-1 bg-[var(--border-light)] my-1"></div>
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-bold text-accent uppercase tracking-tight">{log.action}</p>
                      <p className="text-[9px] opacity-40 font-bold">{log.time}</p>
                    </div>
                    <p className="text-xs font-bold mb-1">By {log.user}</p>
                    <p className="text-[10px] opacity-50 font-medium">{log.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {['Attendance', 'Tasks'].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center animate-in fade-in duration-500">
              <Clock className="w-12 h-12 mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">{activeTab} History coming soon</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-[var(--border-light)] bg-[var(--background)]/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-accent hover:text-white transition-all">
              <History className="w-4 h-4" />
              Activity Log
            </button>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={onClose}
               className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--text)]/40"
             >
               Close
             </button>
             <button className="flex items-center gap-2 px-8 py-3 bg-accent text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
               Edit Profile
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
