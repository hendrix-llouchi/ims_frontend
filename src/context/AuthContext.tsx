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

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const login = (role: UserRole, username: string, isTemporaryPassword: boolean) => {
    setIsLoading(true);
    setUser({ role, username, is_temporary_password: isTemporaryPassword });
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
  };

  const clearTemporaryPasswordFlag = () => {
    setUser((prev) =>
      prev ? { ...prev, is_temporary_password: false } : prev
    );
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
