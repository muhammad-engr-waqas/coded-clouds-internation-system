import React, { useState, useEffect } from 'react';
import { 
  User, 
  Building2, 
  Palette, 
  UserCog, 
  Clock, 
  Calendar, 
  Bell, 
  History,
  Camera,
  Save,
  Plus,
  Trash2,
  Check,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { useAppStore } from '@/src/store';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';

type SettingsTab = 'Profile' | 'Company' | 'Theme' | 'Roles' | 'Attendance' | 'Leave' | 'Notifications';

// The backend stores settings as flat fields on a single Settings document; this UI is built
// around a nested shape (company.*, attendance.*, leave.*). Map once at the edges rather than
// scattering conversions through the JSX below.
function toNested(flat: any) {
  return {
    company: {
      name: flat.companyName,
      logo: flat.companyLogoUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=logo',
      address: flat.companyAddress,
      contact: flat.companyContactEmail,
    },
    attendance: {
      cutoffTime: flat.lateCutoffTime,
      workingHours: flat.standardWorkHours,
      workingDays: flat.workingDays,
    },
    leave: {
      quota: flat.annualLeaveQuota,
      excludeWeekends: flat.excludeWeekendsFromLeaveCount,
      types: flat.leaveTypes,
    },
    notificationPrefs: flat.notificationPrefs,
  };
}

function fromNested(nested: any) {
  return {
    companyName: nested.company.name,
    companyAddress: nested.company.address,
    companyContactEmail: nested.company.contact,
    lateCutoffTime: nested.attendance.cutoffTime,
    standardWorkHours: nested.attendance.workingHours,
    workingDays: nested.attendance.workingDays,
    annualLeaveQuota: nested.leave.quota,
    excludeWeekendsFromLeaveCount: nested.leave.excludeWeekends,
  };
}

export default function AdminSettings() {
  const { user, setUser, theme, setTheme } = useAppStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('Profile');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  // Profile tab local state
  const [profileForm, setProfileForm] = useState({ fullName: user?.fullName || '', email: user?.email || '' });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Sync profile form if user loads after mount
  useEffect(() => {
    if (user) setProfileForm({ fullName: user.fullName, email: user.email });
  }, [user?.id]);

  useEffect(() => {
    fetchSettings();
    fetchRoles();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.settings.get();
      setSettings(toNested(data));
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await api.settings.roles();
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleSaveAll = async () => {
    setIsLoading(true);
    setSaveMessage('');
    try {
      const updated = await api.settings.update(fromNested(settings));
      setSettings(toNested(updated));
      setSaveMessage('Saved');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (error: any) {
      alert(error?.message || 'Error saving settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      await api.settings.addRole(newRoleName.trim());
      setNewRoleName('');
      fetchRoles();
    } catch (error: any) {
      alert(error?.message || 'Error adding role');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.settings.deleteRole(id);
      fetchRoles();
    } catch (error: any) {
      alert(error?.message || 'Error deleting role');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!profileForm.fullName.trim() || !profileForm.email.trim()) {
      setProfileMsg('Name and email are required');
      return;
    }
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const updated = await api.employees.update(user.id, {
        fullName: profileForm.fullName.trim(),
        email: profileForm.email.trim(),
      });
      setUser({ ...user, fullName: updated.fullName, email: updated.email });
      setProfileMsg('Profile saved!');
      setTimeout(() => setProfileMsg(''), 2500);
    } catch (err: any) {
      setProfileMsg(err?.message || 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwMsg('All password fields are required');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg('New passwords do not match');
      return;
    }
    if (pwForm.next.length < 6) {
      setPwMsg('New password must be at least 6 characters');
      return;
    }
    setPwSaving(true);
    setPwMsg('');
    try {
      await api.auth.changePassword(pwForm.current, pwForm.next);
      setPwForm({ current: '', next: '', confirm: '' });
      setPwMsg('Password changed successfully!');
      setTimeout(() => setPwMsg(''), 2500);
    } catch (err: any) {
      setPwMsg(err?.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const tabs = [
    { id: 'Profile', icon: User, label: 'Profile' },
    { id: 'Company', icon: Building2, label: 'Company Info' },
    { id: 'Theme', icon: Palette, label: 'Theme' },
    { id: 'Roles', icon: UserCog, label: 'Roles' },
    { id: 'Attendance', icon: Clock, label: 'Attendance' },
    { id: 'Leave', icon: Calendar, label: 'Leave Policy' },
    { id: 'Notifications', icon: Bell, label: 'Notifications' },
  ];

  if (!settings) return <div className="p-10 text-center opacity-40 font-black uppercase tracking-widest">Loading Settings...</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full">
      {/* Sidebar Tabs */}
      <aside className="w-full lg:w-64 shrink-0 flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 gap-2 no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SettingsTab)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all whitespace-nowrap lg:w-full",
              activeTab === tab.id 
                ? "bg-accent text-white shadow-lg shadow-accent/20 font-black text-xs" 
                : "text-[var(--text)]/50 hover:bg-slate-100 font-bold text-xs"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
        
        <div className="hidden lg:block mt-auto p-6 bg-slate-50 rounded-3xl border border-[var(--border-light)]">
          <History className="w-6 h-6 text-accent mb-3" />
          <p className="text-[10px] font-black uppercase tracking-widest mb-1">System Audit</p>
          <p className="text-[9px] font-medium opacity-50 mb-4">Review all administrative changes and system logs.</p>
          <button className="flex items-center gap-2 text-accent text-[10px] font-black uppercase tracking-widest group">
            Go to Audit Trail <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-[var(--surface)] rounded-[2.5rem] border border-[var(--border-light)] shadow-sm overflow-hidden flex flex-col min-w-0">
        <div className="p-8 border-b border-[var(--border-light)] flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black tracking-tighter">{activeTab} Settings</h2>
            <p className="text-xs font-bold opacity-30 mt-0.5">Manage your system preferences and configurations.</p>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={isLoading}
            className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20 hover:scale-[1.02] transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" /> {isLoading ? 'Saving…' : saveMessage || 'Save All'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'Profile' && (
            <div className="space-y-10 max-w-2xl">
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-3xl bg-slate-100 overflow-hidden ring-4 ring-slate-50">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.fullName || 'Admin'}`} alt="avatar" />
                  </div>
                  <button className="absolute -bottom-2 -right-2 p-2.5 bg-accent text-white rounded-xl shadow-lg shadow-accent/20 hover:scale-110 transition-all">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Full Name</label>
                      <input
                        type="text"
                        value={profileForm.fullName}
                        onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))}
                        className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-accent/10 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Email Address</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-accent/10 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveProfile}
                      disabled={profileSaving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20 hover:scale-[1.02] transition-all disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {profileSaving ? 'Saving…' : 'Save Profile'}
                    </button>
                    {profileMsg && (
                      <span className={`text-[10px] font-black ${profileMsg.includes('saved') ? 'text-green-500' : 'text-red-500'}`}>
                        {profileMsg}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-[var(--border-light)] space-y-6">
                <h3 className="text-sm font-black uppercase tracking-tight">Security & Password</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Current Password</label>
                    <input
                      type="password"
                      value={pwForm.current}
                      onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-accent/10 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40">New Password</label>
                      <input
                        type="password"
                        value={pwForm.next}
                        onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                        placeholder="Enter new password"
                        className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-accent/10 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Confirm Password</label>
                      <input
                        type="password"
                        value={pwForm.confirm}
                        onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                        placeholder="Repeat new password"
                        className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-accent/10 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleChangePassword}
                      disabled={pwSaving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {pwSaving ? 'Updating…' : 'Update Password'}
                    </button>
                    {pwMsg && (
                      <span className={`text-[10px] font-black ${pwMsg.includes('success') ? 'text-green-500' : 'text-red-500'}`}>
                        {pwMsg}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Company' && (
             <div className="space-y-10 max-w-2xl">
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="w-32 h-32 rounded-3xl bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-200 overflow-hidden">
                    <img src={settings.company.logo} alt="logo" className="w-16 h-16 opacity-50 object-contain" />
                  </div>
                  <div className="flex-1 space-y-4 w-full text-center sm:text-left">
                    <h3 className="text-sm font-black uppercase tracking-tight">Company Identity</h3>
                    <p className="text-[10px] font-medium opacity-50">Upload your organization's logo. It will be used on payslips, reports, and the main dashboard.</p>
                    <label className="inline-block px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all cursor-pointer">
                      Change Logo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const updated = await api.settings.uploadLogo(file);
                            setSettings(toNested(updated));
                          } catch (err: any) {
                            alert(err?.message || 'Failed to upload logo');
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-8 border-t border-[var(--border-light)] grid grid-cols-1 gap-6">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Organization Name</label>
                    <input 
                      type="text" 
                      value={settings.company.name} 
                      onChange={(e) => setSettings({ ...settings, company: { ...settings.company, name: e.target.value } })}
                      className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-3 text-xs font-black focus:ring-2 focus:ring-accent/10 focus:outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Corporate Address</label>
                    <textarea 
                      rows={3}
                      value={settings.company.address}
                      onChange={(e) => setSettings({ ...settings, company: { ...settings.company, address: e.target.value } })}
                      className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-accent/10 focus:outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Billing Contact Email</label>
                    <input 
                      type="email" 
                      value={settings.company.contact}
                      onChange={(e) => setSettings({ ...settings, company: { ...settings.company, contact: e.target.value } })}
                      className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-accent/10 focus:outline-none" 
                    />
                  </div>
                </div>
             </div>
          )}

          {activeTab === 'Theme' && (
            <div className="space-y-10 max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'light', label: 'Classic White', desc: 'Clean, light, professional', color: 'bg-white' },
                  { id: 'dark', label: 'Modern Dark', desc: 'Sleek, low-light workspace', color: 'bg-[#0f172a]' },
                  { id: 'sky', label: 'Coded Sky', desc: 'Branded CCIMS experience', color: 'bg-accent' }
                ].map((t) => (
                  <button 
                    key={t.id}
                    onClick={() => setTheme(t.id as any)}
                    className={cn(
                      "group p-6 rounded-3xl border-2 transition-all text-left relative overflow-hidden",
                      theme === t.id ? "border-accent bg-accent/5 ring-4 ring-accent/5" : "border-[var(--border-light)] bg-slate-50 hover:border-accent/40"
                    )}
                  >
                    <div className={cn("w-12 h-12 rounded-2xl mb-4 shadow-inner", t.color)} />
                    <h4 className="text-sm font-black tracking-tight">{t.label}</h4>
                    <p className="text-[10px] font-medium opacity-40 uppercase tracking-widest">{t.desc}</p>
                    {theme === t.id && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-10 border-t border-[var(--border-light)]">
                 <h3 className="text-sm font-black uppercase tracking-tight mb-4">Brand Accent Colors</h3>
                 <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent ring-4 ring-accent/20 cursor-not-allowed flex items-center justify-center text-white">
                      <Check className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-medium opacity-50 max-w-xs">
                      Accent colors are currently locked to CCIMS Sky Blue for consistent branding across modules.
                    </p>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'Roles' && (
            <div className="space-y-10 max-w-3xl">
              <div className="flex items-end gap-4 bg-slate-50 p-6 rounded-3xl border border-[var(--border-light)]">
                <div className="flex-1 space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Add New Organizational Role</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Data Scientist"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full bg-white border border-[var(--border-light)] rounded-xl px-4 py-3 text-xs font-black focus:ring-2 focus:ring-accent/10 focus:outline-none"
                  />
                </div>
                <button 
                  onClick={handleAddRole}
                  className="px-6 py-3 bg-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Role
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-4 bg-white border border-[var(--border-light)] rounded-2xl hover:shadow-md transition-all group">
                    <span className="text-xs font-black text-[var(--text)]/80">{role.name}</span>
                    <button 
                      onClick={() => handleDeleteRole(role.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Attendance' && (
            <div className="space-y-10 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Late Check-in Cutoff</label>
                  <input 
                    type="time" 
                    value={settings.attendance.cutoffTime}
                    onChange={(e) => setSettings({ ...settings, attendance: { ...settings.attendance, cutoffTime: e.target.value } })}
                    className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-3 text-xs font-black focus:ring-2 focus:ring-accent/10 focus:outline-none" 
                  />
                  <p className="text-[9px] font-medium opacity-40 mt-1">Check-ins after this time are marked "Late".</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Work Hours Per Day</label>
                  <input 
                    type="number" 
                    value={settings.attendance.workingHours}
                    onChange={(e) => setSettings({ ...settings, attendance: { ...settings.attendance, workingHours: Number(e.target.value) } })}
                    className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-3 text-xs font-black focus:ring-2 focus:ring-accent/10 focus:outline-none" 
                  />
                </div>
              </div>

              <div className="pt-8 border-t border-[var(--border-light)] space-y-4">
                <h3 className="text-sm font-black uppercase tracking-tight">Active Working Days</h3>
                <div className="flex flex-wrap gap-3">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <button
                      key={day}
                      onClick={() => {
                        const days = settings.attendance.workingDays.includes(day)
                          ? settings.attendance.workingDays.filter((d: string) => d !== day)
                          : [...settings.attendance.workingDays, day];
                        setSettings({ ...settings, attendance: { ...settings.attendance, workingDays: days } });
                      }}
                      className={cn(
                        "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        settings.attendance.workingDays.includes(day)
                          ? "bg-accent text-white shadow-lg shadow-accent/10"
                          : "bg-slate-50 text-slate-400 border border-[var(--border-light)]"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Leave' && (
            <div className="space-y-10 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40">Annual Leave Quota</label>
                  <input 
                    type="number" 
                    value={settings.leave.quota}
                    onChange={(e) => setSettings({ ...settings, leave: { ...settings.leave, quota: Number(e.target.value) } })}
                    className="w-full bg-slate-50 border border-[var(--border-light)] rounded-xl px-4 py-3 text-xs font-black focus:ring-2 focus:ring-accent/10 focus:outline-none" 
                  />
                  <p className="text-[9px] font-medium opacity-40 mt-1">Standard yearly days granted to every employee.</p>
                </div>
                <div className="space-y-6 pt-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-[var(--border-light)]">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Exclude Weekends</span>
                    <button 
                      onClick={() => setSettings({ ...settings, leave: { ...settings.leave, excludeWeekends: !settings.leave.excludeWeekends } })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        settings.leave.excludeWeekends ? "bg-accent" : "bg-slate-200"
                      )}
                    >
                      <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", settings.leave.excludeWeekends ? "right-1" : "left-1")} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-[var(--border-light)] space-y-4">
                 <h3 className="text-sm font-black uppercase tracking-tight">Standard Leave Types</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Sick Leave', 'Casual Leave', 'Annual Leave', 'Emergency Leave', 'Unpaid Leave'].map((type) => (
                      <div key={type} className="flex items-center justify-between p-4 bg-white border border-[var(--border-light)] rounded-2xl">
                         <span className="text-xs font-black">{type}</span>
                         <Check className="w-4 h-4 text-green-500" />
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'Notifications' && (
            <div className="space-y-6 max-w-3xl">
              {[
                { key: 'newEmployee', label: 'New Employee Added' },
                { key: 'taskAssigned', label: 'Task Assigned' },
                { key: 'leaveRequest', label: 'Leave Request Status' },
              ].map((event) => (
                <div key={event.key} className="p-6 bg-slate-50 rounded-3xl border border-[var(--border-light)] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h4 className="text-sm font-black tracking-tight">{event.label}</h4>
                    <p className="text-[10px] font-medium opacity-40 uppercase tracking-widest mt-1">Configure how you receive alerts for this event.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-[var(--border-light)]">
                       <span className="text-[10px] font-black uppercase tracking-widest opacity-50">In-App</span>
                       <button className="w-10 h-5 rounded-full bg-accent relative">
                          <div className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full" />
                       </button>
                    </div>
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-[var(--border-light)]">
                       <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Email</span>
                       <button className="w-10 h-5 rounded-full bg-slate-200 relative">
                          <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full" />
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
