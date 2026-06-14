import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { UserRole } from '../types/auth';
export type { UserRole };

interface AuthUser {
  role: UserRole;
  username: string;
  is_temporary_password: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (role: UserRole, username: string, isTemporaryPassword: boolean) => void;
  logout: () => void;
  clearTemporaryPasswordFlag: () => void;
}

const AUTH_STORAGE_KEY = 'ims_auth_user';

function loadUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  } catch {
    return null;
  }
}

function saveUser(user: AuthUser | null): void {
  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage — survives StrictMode double-mounts and page refreshes
  const [user, setUser] = useState<AuthUser | null>(loadUser);
  const [isLoading] = useState<boolean>(false);

  const login = (role: UserRole, username: string, isTemporaryPassword: boolean) => {
    const newUser: AuthUser = { role, username, is_temporary_password: isTemporaryPassword };
    saveUser(newUser);
    setUser(newUser);
  };

  const logout = () => {
    saveUser(null);
    setUser(null);
  };

  const clearTemporaryPasswordFlag = () => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, is_temporary_password: false };
      saveUser(updated);
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, clearTemporaryPasswordFlag }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
