/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 
  | 'Backend Dev' 
  | 'Frontend Dev' 
  | 'UI/UX Designer' 
  | 'HR' 
  | 'Marketing' 
  | 'Sales' 
  | 'Social Media' 
  | 'Project Manager' 
  | 'Admin';

export type UserStatus = 'Active' | 'Suspended' | 'Separated';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  department: string;
  designation: string;
  joiningDate: string;
  reportingManagerId?: string;
  status: UserStatus;
  avatarUrl?: string;
  documents?: UserDocument[];
  basicSalary?: number;
}

export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Leave' | 'Weekend';

export interface Attendance {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:mm:ss
  checkOut?: string; // HH:mm:ss
  totalHours?: number;
  status: AttendanceStatus;
  notes?: string;
  adjustedBy?: string;
  adjustmentReason?: string;
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Under Review' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // userId
  assignedToName: string;
  assignedToRole: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  project?: string;
  attachments?: string[];
  reportCount: number;
  createdAt: string;
  createdBy: string;
}

export interface TaskReport {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  text: string;
  attachments?: string[];
  timestamp: string;
}

export type ChatType = 'Channel' | 'DirectMessage';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  attachments?: string[];
  readBy?: string[];
}

export interface Chat {
  id: string;
  name: string;
  type: ChatType;
  description?: string;
  members: string[]; // userIds
  lastMessage?: ChatMessage;
  unreadCount?: number;
  isArchived?: boolean;
  createdBy?: string;
}

export type ProjectStatus = 'Pending' | 'In Progress' | 'Completed' | 'Planning' | 'Active' | 'Paused' | 'Done';
export type LeaveType = 'Sick' | 'Casual' | 'Annual' | 'Emergency' | 'Unpaid';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  isDone?: boolean;
  completed?: boolean;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  team?: string[]; // userIds
  teamMemberIds?: string[];
  startDate: string;
  endDate?: string;
  description?: string;
  budget?: number;
  progress: number; // 0-100
  milestones?: Milestone[];
  attachments?: string[];
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  rejectionReason?: string;
  attachment?: string;
}

export type PayrollStatus = 'Pending' | 'Processing' | 'Paid';

export interface Payroll {
  id: string;
  userId: string;
  month: string; // "YYYY-MM"
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  status: PayrollStatus;
  paidAt?: string;
  paidBy?: string;
  notes?: string;
}

export interface UserDocument {
  id: string;
  type: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  memberIds: string[];
  type: 'public' | 'private';
  isAnnouncements?: boolean;
}

export interface Message {
  id: string;
  channelId?: string;
  recipientId?: string;
  senderId: string;
  text: string;
  attachments?: string[];
  createdAt: string;
  readBy: string[];
}
