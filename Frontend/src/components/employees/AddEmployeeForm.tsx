import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  X, UserPlus, Cloud, Lock, Mail, Phone, Briefcase,
  Calendar, RefreshCw, Copy, Eye, EyeOff, Search,
  CheckCircle2, Loader2, FileText, Download, Trash2,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { OptionalDocumentUploader } from '../ui/OptionalDocumentUploader';
import { api, fileUrl } from '@/src/lib/api';
import { User } from '@/src/types';

// Add mode: password required. Edit mode: password optional (blank = keep current).
const baseSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  department: z.string().optional(),
  designation: z.string().optional(),
  joiningDate: z.string().min(1, 'Joining date is required'),
  reportingManagerId: z.string().optional(),
  basicSalary: z.coerce.number().min(0, 'Salary must be positive').optional(),
});
const addSchema = baseSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
const editSchema = baseSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
});

type EmployeeFormData = z.infer<typeof addSchema>;

interface AddEmployeeFormProps {
  onClose: () => void;
  onSuccess: (newEmployee: any) => void;
  employee?: User;
}

export function AddEmployeeForm({ onClose, onSuccess, employee }: AddEmployeeFormProps) {
  const isEdit = !!employee;
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // New files to upload (null = no change for that slot)
  const [newDocs, setNewDocs] = useState<Record<string, File | null>>({
    cv: null, experienceLetter: null, cnicFront: null,
    cnicBack: null, offerLetter: null, contract: null,
  });
  // Existing docs from employee (for edit mode display)
  const existingDocs: any[] = (isEdit && employee?.documents) ? employee.documents : [];

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<EmployeeFormData>({
    resolver: zodResolver(isEdit ? editSchema : addSchema) as any,
    defaultValues: isEdit ? {
      fullName: employee!.fullName,
      username: employee!.username,
      email: employee!.email,
      phone: employee!.phone || '',
      role: employee!.role,
      department: employee!.department || '',
      designation: employee!.designation || '',
      joiningDate: employee!.joiningDate
        ? new Date(employee!.joiningDate).toISOString().split('T')[0]
        : '',
      reportingManagerId: employee!.reportingManagerId || '',
      basicSalary: employee!.basicSalary ?? 0,
      password: '',
    } as any : {
      joiningDate: new Date().toISOString().split('T')[0],
    } as any,
  });

  const fullName = watch('fullName');

  // Auto-suggest username only in add mode
  useEffect(() => {
    if (fullName && !isEdit) {
      setValue('username', fullName.toLowerCase().replace(/\s+/g, '.'));
    }
  }, [fullName, setValue, isEdit]);

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setValue('password', pass);
    setShowPassword(true);
  };

  const copyPassword = () => {
    const pass = watch('password');
    if (pass) navigator.clipboard.writeText(pass);
  };

  const onSubmit = async (data: EmployeeFormData) => {
    setIsLoading(true);
    try {
      const payload: any = { ...data };
      // Don't send empty password in edit mode
      if (isEdit && !payload.password) delete payload.password;
      // Empty string for optional ObjectId — send null instead
      if (!payload.reportingManagerId || payload.reportingManagerId.trim() === '') {
        delete payload.reportingManagerId;
      }

      const saved = isEdit
        ? await api.employees.update(employee!.id, payload)
        : await api.employees.create(payload);

      // Only upload NEW files (skip slots where user didn't pick anything)
      const toUpload = Object.entries(newDocs).filter((e): e is [string, File] => e[1] !== null);
      if (toUpload.length > 0) {
        await Promise.all(toUpload.map(([type, file]) =>
          api.employees.uploadDocument(saved.id, file, type)
        ));
        const updated = await api.employees.get(saved.id);
        onSuccess(updated);
      } else {
        onSuccess(saved);
      }
    } catch (err: any) {
      alert(err?.message || 'Error saving employee. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExistingDoc = async (docId: string) => {
    if (!employee || !confirm('Delete this document?')) return;
    try {
      const updated = await api.employees.deleteDocument(employee.id, docId);
      onSuccess(updated);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete document');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[var(--surface)] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-[var(--border)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-light)] flex items-center justify-between shrink-0 bg-[var(--background)]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight">{isEdit ? 'Edit Employee' : 'Add New Employee'}</h2>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Employee Management System</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--background)] rounded-full transition-colors text-[var(--text)]/40 hover:text-[var(--text)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit as any)} className="flex-1 overflow-y-auto p-8 space-y-10">

          {/* ── Section 1: Basic Info ── */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-[var(--border-light)] pb-2">
              <div className="w-1.5 h-4 bg-accent rounded-full" />
              <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Basic Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Full Name *</label>
                <div className="relative">
                  <Cloud className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
                  <input {...register('fullName')}
                    className={cn("w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all", errors.fullName && "border-red-300")}
                    placeholder="Enter full name" />
                </div>
                {errors.fullName && <p className="text-[9px] text-red-500 font-bold">{errors.fullName.message}</p>}
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Username *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
                  <input {...register('username')}
                    className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl py-2.5 pl-10 pr-10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all"
                    placeholder="s.connor" />
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-500" />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
                  <input {...register('email')} type="email"
                    className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all"
                    placeholder="email@codedclouds.com" />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
                  <input {...register('phone')}
                    className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all"
                    placeholder="+92 300 1234567" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">
                  {isEdit ? 'New Password — leave blank to keep current password' : 'Password *'}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
                    <input {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={cn("w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl py-2.5 pl-10 pr-20 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all", errors.password && "border-red-300")}
                      placeholder={isEdit ? '(unchanged)' : '••••••••••••'} />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button type="button" onClick={copyPassword} className="p-1.5 hover:bg-accent/10 rounded-lg text-[var(--text)]/30 hover:text-accent transition-all" title="Copy">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1.5 hover:bg-accent/10 rounded-lg text-[var(--text)]/30 hover:text-accent transition-all">
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <button type="button" onClick={generatePassword}
                    className="flex items-center gap-2 px-4 bg-[var(--background)] border border-accent/20 text-accent rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all whitespace-nowrap">
                    <RefreshCw className="w-3 h-3" /> Generate
                  </button>
                </div>
                {errors.password && <p className="text-[9px] text-red-500 font-bold">{(errors.password as any).message}</p>}
              </div>

            </div>
          </div>

          {/* ── Section 2: Org Details ── */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-[var(--border-light)] pb-2">
              <div className="w-1.5 h-4 bg-accent rounded-full" />
              <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Organization Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Role *</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
                  <select {...register('role')}
                    className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold focus:outline-none appearance-none">
                    <option value="">Select Role</option>
                    <option value="Backend Dev">Backend Developer</option>
                    <option value="Frontend Dev">Frontend Developer</option>
                    <option value="UI/UX Designer">UI/UX Designer</option>
                    <option value="HR">HR</option>
                    <option value="Admin">Admin</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Project Manager">Project Manager</option>
                  </select>
                </div>
                {errors.role && <p className="text-[9px] text-red-500 font-bold">{errors.role.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Department</label>
                <input {...register('department')}
                  className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl py-2.5 px-4 text-xs font-bold focus:outline-none"
                  placeholder="e.g. Engineering" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Designation</label>
                <input {...register('designation')}
                  className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl py-2.5 px-4 text-xs font-bold focus:outline-none"
                  placeholder="e.g. Senior Developer" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Joining Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/30" />
                  <input {...register('joiningDate')} type="date"
                    className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold focus:outline-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50">Basic Salary (PKR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-30">PKR</span>
                  <input {...register('basicSalary')} type="number"
                    className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-xl py-2.5 pl-12 pr-4 text-xs font-bold focus:outline-none"
                    placeholder="85000" />
                </div>
              </div>

            </div>
          </div>

          {/* ── Section 3: Documents ── */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-2">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-4 bg-accent rounded-full" />
                <h3 className="text-xs font-black uppercase tracking-widest opacity-60">Documents</h3>
              </div>
              <span className="text-[9px] font-black text-accent uppercase tracking-widest bg-accent/5 px-2 py-0.5 rounded">Optional</span>
            </div>

            {/* Existing documents (edit mode only) */}
            {isEdit && existingDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Existing Documents</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {existingDocs.map((doc: any) => (
                    <div key={doc.id || doc._id} className="flex items-center justify-between p-3 bg-[var(--background)]/40 border border-[var(--border-light)] rounded-xl group">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-accent shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold truncate">{doc.name}</p>
                          <p className="text-[9px] opacity-40 uppercase">{doc.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <a href={fileUrl(doc.url)} target="_blank" rel="noreferrer" download={doc.name}
                          className="p-1 hover:bg-accent/10 rounded text-[var(--text)]/30 hover:text-accent transition-colors" title="Download">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button type="button" onClick={() => handleDeleteExistingDoc(doc.id || doc._id)}
                          className="p-1 hover:bg-red-50 rounded text-[var(--text)]/30 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New document upload slots */}
            <div>
              {isEdit && <p className="text-[10px] font-bold text-[var(--text)]/40 italic mb-4">Upload new documents to add them alongside existing ones.</p>}
              {!isEdit && <p className="text-[10px] font-bold text-[var(--text)]/40 italic mb-4">You can skip and add documents later from the employee profile.</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <OptionalDocumentUploader label="CV / Resume" type="cv" value={newDocs.cv} onUpload={(f) => setNewDocs(p => ({ ...p, cv: f }))} />
                <OptionalDocumentUploader label="Experience Letter" type="exp" value={newDocs.experienceLetter} onUpload={(f) => setNewDocs(p => ({ ...p, experienceLetter: f }))} />
                <OptionalDocumentUploader label="CNIC Front" type="cnic_f" value={newDocs.cnicFront} onUpload={(f) => setNewDocs(p => ({ ...p, cnicFront: f }))} />
                <OptionalDocumentUploader label="CNIC Back" type="cnic_b" value={newDocs.cnicBack} onUpload={(f) => setNewDocs(p => ({ ...p, cnicBack: f }))} />
                <OptionalDocumentUploader label="Offer Letter" type="offer" value={newDocs.offerLetter} onUpload={(f) => setNewDocs(p => ({ ...p, offerLetter: f }))} />
                <OptionalDocumentUploader label="Signed Contract" type="contract" value={newDocs.contract} onUpload={(f) => setNewDocs(p => ({ ...p, contract: f }))} />
              </div>
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-[var(--border-light)] bg-[var(--background)]/30 flex items-center justify-between shrink-0">
          <button type="button" onClick={onClose}
            className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--text)]/40 hover:text-[var(--text)] transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit(onSubmit as any)} disabled={isLoading}
            className="flex items-center gap-2 px-8 py-3 bg-accent text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all">
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : 'Save Employee'}
          </button>
        </div>

      </div>
    </div>
  );
}
