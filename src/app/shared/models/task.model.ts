export type Priority = 'high' | 'medium' | 'low';
export type ColumnId = 'backlog' | 'todo' | 'inprogress' | 'review' | 'done';

export enum UserRole {
  MANAGER = 'manager',
  TEAM_LEAD = 'team_lead',
  EMPLOYEE = 'employee',
}

export interface TaskFile {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

export interface Task {
  _id: string;
  columnId: ColumnId;
  title: string;
  description: string;
  priority: Priority;
  tags: string[];
  assignedTo: string;
  createdById: string;
  files: TaskFile[];
  createdAt: Date;
  updatedAt: Date;
  order: number;
}

export interface Column {
  id: ColumnId;
  title: string;
  color: string;
  tasks: Task[];
}

export interface User {
  id: string;
  name: string;
  initials: string;
  role: UserRole;
  avatarColor: string;
  avatarBg: string;
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: Priority;
  columnId: ColumnId;
  tags: string[];
  assignedTo: string;
  files: TaskFile[];
}

export interface DialogData {
  task?: Task;
  defaultColumnId?: ColumnId;
  currentUser: User;
  allUsers: User[];
}
