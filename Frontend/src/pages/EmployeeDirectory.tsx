import React, { useState, useEffect } from 'react';
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
  Power
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { User } from '@/src/types';
import { exportToCSV } from '@/src/lib/exportUtils';
import { AddEmployeeForm } from '../components/employees/AddEmployeeForm';
import { EmployeeProfileDetail } from '../components/employees/EmployeeProfileDetail';
import { api } from '@/src/lib/api';

export function EmployeeDirectory() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const { employees: list } = await api.employees.list({ limit: '200' });
      setEmployees(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuccess = (newEmployee: User) => {
    setEmployees(prev => [newEmployee, ...prev]);
    setIsAddModalOpen(false);
  };

  const handleEditSuccess = (updatedEmployee: User) => {
    setEmployees(prev => prev.map(e => e.id === updatedEmployee.id ? { ...e, ...updatedEmployee } : e));
    setIsEditModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleAction = async (employee: User, action: 'view' | 'edit' | 'delete' | 'suspend') => {
    setSelectedEmployee(employee);
    if (action === 'view') setIsViewModalOpen(true);
    if (action === 'edit') setIsEditModalOpen(true);
    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${employee.fullName}?`)) return;
      const prev = employees;
      setEmployees(p => p.filter(e => e.id !== employee.id));
      try {
        await api.employees.remove(employee.id);
      } catch (err: any) {
        alert(err?.message || 'Failed to delete employee');
        setEmployees(prev);
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isAddModalOpen && (
        <AddEmployeeForm 
          onClose={() => setIsAddModalOpen(false)} 
          onSuccess={handleAddSuccess}
        />
      )}
      {isEditModalOpen && selectedEmployee && (
        <AddEmployeeForm 
          employee={selectedEmployee}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEmployee(null);
          }} 
          onSuccess={handleEditSuccess}
        />
      )}
      {isViewModalOpen && selectedEmployee && (
        <EmployeeProfileDetail 
          employee={selectedEmployee}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedEmployee(null);
          }}
          onUpdate={handleEditSuccess}
          onDelete={(id) => {
            setEmployees(prev => prev.filter(e => e.id !== id));
            setIsViewModalOpen(false);
            setSelectedEmployee(null);
          }}
        />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employee Directory</h1>
          <p className="text-[var(--text)]/50 text-sm">Manage your team members and their roles.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => exportToCSV(employees, 'Employee_Directory')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--background)] transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-bold shadow-lg shadow-accent/20 hover:scale-105 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-[var(--border)] flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]/40" />
            <input
              type="text"
              placeholder="Search by name, email, or username..."
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <select className="bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-medium focus:outline-none hidden sm:block">
              <option>All Roles</option>
              <option>Engineering</option>
              <option>Design</option>
              <option>HR</option>
            </select>
            <button className="p-2 bg-[var(--background)] border border-[var(--border)] rounded-xl hover:text-accent transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="sm:hidden divide-y divide-[var(--border-light)]">
          {employees.map((emp) => (
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
                )}>
                  {emp.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-[10px] font-medium text-[var(--text)]/60">
                  <Mail className="w-3.5 h-3.5 opacity-30" />
                  {emp.email}
                </div>
                <div className="text-[10px] text-[var(--text)]/60 font-bold">
                  Joined: {emp.joiningDate}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-light)]">
                <div className="flex gap-1">
                  <button onClick={() => handleAction(emp, 'view')} className="p-2 bg-slate-50 rounded-lg"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => handleAction(emp, 'edit')} className="p-2 bg-slate-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleAction(emp, 'suspend')}
                    className={cn("p-2 rounded-lg", emp.status === 'Active' ? "bg-orange-50 text-orange-600" : "bg-green-50 text-green-600")}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleAction(emp, 'delete')} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
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
              {employees.map((emp) => (
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
                    <div>
                      <p className="text-[11px] font-bold text-[var(--text)]/80 leading-tight">{emp.role}</p>
                      <p className="text-[9px] text-[var(--text)]/40 font-black uppercase tracking-tighter mt-0.5">{emp.department}</p>
                    </div>
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text)]/60">
                        <Mail className="w-3 h-3 opacity-30" />
                        {emp.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-2.5 text-[10px] text-[var(--text)]/60 font-bold">
                    {emp.joiningDate}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                      emp.status === 'Active' ? "bg-green-100 text-green-700" : 
                      emp.status === 'Suspended' ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                    )}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleAction(emp, 'view')}
                        className="p-1.5 hover:bg-accent/10 hover:text-accent rounded-lg transition-colors group/btn"
                        title="View Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleAction(emp, 'edit')}
                        className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                        title="Edit Employee"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleAction(emp, 'suspend')}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          emp.status === 'Active' ? "hover:bg-orange-50 hover:text-orange-600" : "hover:bg-green-50 hover:text-green-600"
                        )}
                        title={emp.status === 'Active' ? 'Suspend Account' : 'Activate Account'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleAction(emp, 'delete')}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                        title="Delete Employee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-xs font-bold text-[var(--text)]/40">
          <p>Showing 1 to {employees.length} of 124 employees</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 bg-[var(--background)] border border-[var(--border)] rounded-lg hover:text-accent transition-colors">Prev</button>
            <button className="px-3 py-1 bg-accent text-white rounded-lg">1</button>
            <button className="px-3 py-1 bg-[var(--background)] border border-[var(--border)] rounded-lg hover:text-accent transition-colors">2</button>
            <button className="px-3 py-1 bg-[var(--background)] border border-[var(--border)] rounded-lg hover:text-accent transition-colors">3</button>
            <button className="px-3 py-1 bg-[var(--background)] border border-[var(--border)] rounded-lg hover:text-accent transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
