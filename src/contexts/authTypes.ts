import { createContext } from 'react';
import type { Student, UserRole } from '../types/database';

export interface AuthUser {
  id: string;
  email: string;
  nama: string;
  role: UserRole;
}

export interface AuthContextType {
  user: AuthUser | null;
  student: Student | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, passwordOrNisn: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshStudentData: () => void;
  updateStudentPhoto: (photoUrl: string | null) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
