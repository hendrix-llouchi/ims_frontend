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
  role: UserRole;
  username: string;
  is_temporary_password: boolean;
}

export interface ChangePasswordPayload {
  username: string;
  new_password: string;
}
