import type { UserRole } from './auth';

export type WorkerStatus = 'active' | 'inactive' | 'on_leave';

export interface Worker {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: WorkerStatus;
  department?: string;
  hiredAt: string;
  createdAt: string;
  updatedAt: string;
}
