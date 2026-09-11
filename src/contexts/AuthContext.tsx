import React, { useState } from 'react';
import type { Student, UserRole } from '../types/database';
import { AuthContext, type AuthUser } from './authTypes';

import { dataStore } from '../services/dataStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getOrCreateDeviceToken } from '../lib/device';
import { safeStorage } from '../lib/storage';

const AUTH_STORAGE_KEY = 'pplg3_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = safeStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved).user : null;
    } catch {
      return null;
    }
  });

  const [role, setRole] = useState<UserRole | null>(() => {
    try {
      const saved = safeStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved).role : null;
    } catch {
      return null;
    }
  });

  const [student, setStudent] = useState<Student | null>(() => {
    try {
      const saved = safeStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.studentId) {
          return dataStore.getStudentById(parsed.studentId) || null;
        }
      }
    } catch {
      return null;
    }
    return null;
  });

  const [isLoading] = useState(false);

  const refreshStudentData = () => {
    if (student) {
      const updated = dataStore.getStudentById(student.id);
      if (updated) setStudent({ ...updated });
    }
  };

  const updateStudentPhoto = (photoUrl: string | null): boolean => {
    if (!student) return false;
    const ok = dataStore.updateStudent(student.id, { foto_url: photoUrl });
    if (ok) {
      const updated = dataStore.getStudentById(student.id);
      if (updated) {
        setStudent({ ...updated });
      }
      dataStore.addLog('LOGIN', `Siswa ${student.nama} memperbarui foto profil pribadi`);
    }
    return ok;
  };

  // Auto-sync student updates from dataStore
  React.useEffect(() => {
    return dataStore.subscribe(() => {
      if (student) {
        const updated = dataStore.getStudentById(student.id);
        if (updated) setStudent({ ...updated });
      }
    });
  }, [student?.id]);

  const login = async (email: string, passwordOrNisn: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanSecret = passwordOrNisn.trim();

    // 1. Check for Admin / Ketua Kelas Login
    const isAdminEmail = 
      cleanEmail === 'admin.pplg3@smkn1ciomas.sch.id' || 
      cleanEmail === 'admin@smkn1ciomas.sch.id' || 
      cleanEmail === 'ketuakelas.pplg3@gmail.com' ||
      cleanEmail === 'admin';

    if (isAdminEmail) {
      // Default admin password
      if (cleanSecret === 'admin123' || cleanSecret === 'pplg3ciomas' || cleanSecret === 'admin') {
        const adminUser: AuthUser = {
          id: 'admin-pplg3-id',
          email: cleanEmail,
          nama: 'Ketua Kelas / Admin XI PPLG 3',
          role: 'admin',
        };

        setUser(adminUser);
        setRole('admin');
        setStudent(null);

        safeStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
          user: adminUser,
          role: 'admin',
          studentId: null,
        }));

        dataStore.addLog('LOGIN', `Admin / Ketua Kelas login (${cleanEmail})`, adminUser.id);
        return { success: true, message: 'Selamat datang kembali, Admin / Ketua Kelas!' };
      } else {
        return { success: false, message: 'Password admin salah. Silakan coba lagi.' };
      }
    }

    // 2. Check for Student Login (Email akun kelas + NISN siswa sebagai password)
    const foundStudent = dataStore.getStudentByEmail(cleanEmail);

    if (!foundStudent) {
      return { 
        success: false, 
        message: 'Email siswa tidak terdaftar dalam kelas XI PPLG 3. Pastikan menggunakan email akun kelas kamu.' 
      };
    }

    // Password validation using NISN
    if (foundStudent.nisn !== cleanSecret) {
      return { 
        success: false, 
        message: 'Password / NISN salah. Siswa login menggunakan NISN masing-masing.' 
      };
    }

    const studentUser: AuthUser = {
      id: foundStudent.user_id || foundStudent.id,
      email: foundStudent.email,
      nama: foundStudent.nama,
      role: 'student',
    };

    setUser(studentUser);
    setRole('student');
    setStudent(foundStudent);

    safeStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      user: studentUser,
      role: 'student',
      studentId: foundStudent.id,
    }));

    const device = getOrCreateDeviceToken();
    dataStore.addLog('LOGIN', `Siswa login: ${foundStudent.nama} (Absen: ${foundStudent.nomor_absen})`, studentUser.id, device);

    return { 
      success: true, 
      message: `Selamat datang, ${foundStudent.nama}!` 
    };
  };

  const logout = async () => {
    if (user) {
      dataStore.addLog('LOGOUT', `${user.nama} (${role}) telah keluar dari sistem`, user.id);
    }
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut notice:', e);
      }
    }
    setUser(null);
    setStudent(null);
    setRole(null);
    safeStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        student,
        role,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshStudentData,
        updateStudentPhoto,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

