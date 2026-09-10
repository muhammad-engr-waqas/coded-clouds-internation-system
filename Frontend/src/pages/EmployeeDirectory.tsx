import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  UserPlus,
  Download,
  Eye,
  Edit2,
  Trash2,
  Power,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { User } from '@/src/types';
import { exportToCSV } from '@/src/lib/exportUtils';
import { AddEmployeeForm } from '../components/employees/AddEmployeeForm';
import { EmployeeProfileDetail } from '../components/employees/EmployeeProfileDetail';
import { api } from '@/src/lib/api';

// All roles that exist in the system — fetched from backend on mount
export function EmployeeDirectory() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState('');

  // Filters
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [roles, setRoles]         = useState<string[]>([]);

  const [isAddModalOpen, setIsAddModalOpen]     = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [isViewModalOpen, setIsViewModalOpen]   = useState(false);
  const [isEditModalOpen, setIsEditModalOpen]   = useState(false);

  const LIMIT = 20;

  // Fetch roles from backend for the filter dropdown (no hardcoding)
  useEffect(() => {
    api.settings.roles()
      .then((data: any[]) => setRoles(data.map((r: any) => r.name).sort()))
      .catch(() => {});
  }, []);

  const fetchEmployees = useCallback(async (pg = 1) => {
    setIsLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {
        page:  String(pg),
        limit: String(LIMIT),
      };
      if (search.trim())   params.search     = search.trim();
      if (roleFilter)      params.role       = roleFilter;

      const data = await api.employees.list(params);
      setEmployees(data.employees ?? []);
      setTotal(data.total ?? 0);
      setPage(pg);
    } catch (err: any) {
      setError(err?.message || 'Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter]);

  // Re-fetch when search or role filter changes (debounced for search)
  useEffect(() => {
    const t = setTimeout(() => fetchEmployees(1), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, roleFilter]);

  const handleAddSuccess = (newEmployee: User) => {
    setEmployees(prev => [newEmployee, ...prev]);
    setTotal(t => t + 1);
    setIsAddModalOpen(false);
  };

  const handleEditSuccess = (updatedEmployee: User) => {
    setEmployees(prev => prev.map(e => e.id === updatedEmployee.id ? { ...e, ...updatedEmployee } : e));
    setIsEditModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleAction = async (employee: User, action: 'view' | 'edit' | 'delete' | 'suspend') => {
    setSelectedEmployee(employee);
    if (action === 'view') { setIsViewModalOpen(true); return; }
    if (action === 'edit') { setIsEditModalOpen(true); return; }
    if (action === 'delete') {
      if (!confirm(`Delete ${employee.fullName}? This cannot be undone.`)) return;
      const prev = employees;
      setEmployees(p => p.filter(e => e.id !== employee.id));
      setTotal(t => t - 1);
      try {
        await api.employees.remove(employee.id);
      } catch (err: any) {
        alert(err?.message || 'Failed to delete employee');
        setEmployees(prev);
        setTotal(t => t + 1);
      }
    }
    if (action === 'suspend') {
      const newStatus = employee.status === 'Active' ? 'Suspended' : 'Active';
      const prev = employees;
      setEmployees(p => p.map(e => e.id === employee.id ? { ...e, status: newStatus } : e));
      try {
        const updated = await api.employees.setStatus(employee.id, newStatus);
        setEmployees(p => p.map(e => e.id === employee.id ? { ...e, ...updated } : e));
      } catch (err: any) {
        alert(err?.message || 'Failed to update status');
        setEmployees(prev);
      }
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isAddModalOpen && (
        <AddEmployeeForm onClose={() => setIsAddModalOpen(false)} onSuccess={handleAddSuccess} />
      )}
      {isEditModalOpen && selectedEmployee && (
        <AddEmployeeForm
          employee={selectedEmployee}
          onClose={() => { setIsEditModalOpen(false); setSelectedEmployee(null); }}
          onSuccess={handleEditSuccess}
        />
      )}
      {isViewModalOpen && selectedEmployee && (
        <EmployeeProfileDetail
          employee={selectedEmployee}
          onClose={() => { setIsViewModalOpen(false); setSelectedEmployee(null); }}
          onUpdate={handleEditSuccess}
          onDelete={(id) => {
            setEmployees(prev => prev.filter(e => e.id !== id));
            setIsViewModalOpen(false);
            setSelectedEmployee(null);
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employee Directory</h1>
          <p className="text-[var(--text)]/50 text-sm">
            {total} employee{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(employees, 'Employee_Directory')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--background)] transition-all"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:scale-105 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-[var(--border)] flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or username..."
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>

          {/* Role Filter — loaded from backend, not hardcoded */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none"
          >
            <option value="">All Roles</option>
            {roles.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden divide-y divide-[var(--border-light)]">
          {isLoading ? (
            <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-accent" /></div>
          ) : employees.length === 0 ? (
            <div className="p-10 text-center opacity-30">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs font-bold uppercase tracking-widest">No employees found</p>
            </div>
          ) : employees.map((emp) => (
            <div key={emp.id} className="p-4 active:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-black text-sm">
                    {emp.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-black leading-tight">{emp.fullName}</p>
                    <p className="text-[10px] text-[var(--text)]/40 font-bold uppercase tracking-widest mt-0.5">{emp.role}</p>
                  </div>
                </div>
                <span className={cn(
                  "text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter",
                  emp.status === 'Active' ? "bg-green-100 text-green-700" :
                  emp.status === 'Suspended' ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                )}>{emp.status}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-light)]">
                <div className="flex gap-1">
                  <button onClick={() => handleAction(emp, 'view')} className="p-2 bg-slate-50 rounded-lg"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => handleAction(emp, 'edit')} className="p-2 bg-slate-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleAction(emp, 'suspend')} className={cn("p-2 rounded-lg", emp.status === 'Active' ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600")}>
                    <Power className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleAction(emp, 'delete')} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--background)]/50 text-[9px] font-black uppercase tracking-widest text-[var(--text)]/40 border-b border-[var(--border-light)]">
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Role & Dept</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Joining Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {isLoading ? (
                <tr><td colSpan={6} className="px-5 py-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
                </td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-20 text-center opacity-30">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">No employees found</p>
                </td></tr>
              ) : employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-[var(--background)]/30 transition-colors group">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-black text-xs group-hover:scale-110 transition-transform">
                        {emp.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold leading-tight">{emp.fullName}</p>
                        <p className="text-[9px] text-[var(--text)]/40 font-black tracking-tight mt-0.5">@{emp.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-2.5">
                    <p className="text-[11px] font-bold text-[var(--text)]/80 leading-tight">{emp.role}</p>
                    <p className="text-[9px] text-[var(--text)]/40 font-black uppercase tracking-tighter mt-0.5">{emp.department}</p>
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text)]/60">
                      <Mail className="w-3 h-3 opacity-30" />{emp.email}
                    </div>
                  </td>
                  <td className="px-5 py-2.5 text-[10px] text-[var(--text)]/60 font-bold">{emp.joiningDate}</td>
                  <td className="px-5 py-2.5">
                    <span className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                      emp.status === 'Active' ? "bg-green-100 text-green-700" :
                      emp.status === 'Suspended' ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                    )}>{emp.status}</span>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleAction(emp, 'view')} className="p-1.5 hover:bg-accent/10 hover:text-accent rounded-lg transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleAction(emp, 'edit')} className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleAction(emp, 'suspend')} className={cn("p-1.5 rounded-lg transition-colors", emp.status === 'Active' ? "hover:bg-orange-50 hover:text-orange-600" : "hover:bg-green-50 hover:text-green-600")} title={emp.status === 'Active' ? 'Suspend' : 'Activate'}><Power className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleAction(emp, 'delete')} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-xs font-bold text-[var(--text)]/40">
          <p>Showing {employees.length} of {total} employees</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchEmployees(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 bg-[var(--background)] border border-[var(--border)] rounded-lg hover:text-accent transition-colors disabled:opacity-30"
            >Prev</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} onClick={() => fetchEmployees(p)}
                  className={cn("px-3 py-1 rounded-lg", page === p ? "bg-accent text-white" : "bg-[var(--background)] border border-[var(--border)] hover:text-accent transition-colors")}
                >{p}</button>
              );
            })}
            <button
              onClick={() => fetchEmployees(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 bg-[var(--background)] border border-[var(--border)] rounded-lg hover:text-accent transition-colors disabled:opacity-30"
            >Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
