
export type Role = 'student' | 'industrial-supervisor' | 'academic-supervisor' | 'admin';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string; // For auth simulation
  role: Role;
  avatar?: string; // Base64 string for profile picture
  studentId?: string; // For students
  gender?: 'Male' | 'Female' | 'Other'; // For students
  school?: string; // For students
  faculty?: string; // For students
  department?: string; // For students
  level?: string; // e.g., '100', '200' // For students
  company?: string; // For industrial supervisors
  companyRole?: string; // For industrial supervisors
  supervisorCode?: string; // For industrial supervisors
  industrialSupervisorId?: string; // For students
  academicSupervisorId?: string; // For students
  assignedStudentIds?: string[]; // For supervisors
}

export enum LogbookStatus {
    DRAFT = 'Draft',
    PENDING_APPROVAL = 'Pending Approval',
    APPROVED = 'Approved',
    REJECTED = 'Rejected',
}

export interface LogbookEntry {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  week: number;
  day: string; // e.g., 'Monday'
  tasks: string;
  skillsLearned: string;
  status: LogbookStatus;
  supervisorFeedback?: string;
}

export interface Evaluation {
    id: string;
    studentId: string;
    academicSupervisorId: string;
    grade: number; // e.g., out of 100
    comments: string;
    date: string;
}