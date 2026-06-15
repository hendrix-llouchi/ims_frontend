export type UserRole = 'owner' | 'manager' | 'worker';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  password_confirmation: string;
}

export interface LoginResponse {
  message: string;
  id: number;
  role: UserRole;
  username: string;
  is_temporary_password: boolean;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  location: string | null;
  emergency_contact: string | null;
}

export interface ChangePasswordPayload {
  username: string;
  new_password: string;
}
