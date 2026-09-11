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
          const found = dataStore.getStudentById(parsed.studentId);
          if (found) {
            const photoBackup = parsed.studentPhoto || safeStorage.getItem(`pplg3_foto_${found.id}`) || safeStorage.getItem(`pplg3_foto_nisn_${found.nisn}`);
            if (!found.foto_url && photoBackup) {
              found.foto_url = photoBackup;
            }
            return found;
          }
          if (parsed.studentData) {
            return parsed.studentData;
          }
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

      // 1. Update AUTH_STORAGE_KEY with studentPhoto
      try {
        const saved = safeStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          safeStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
            ...parsed,
            studentPhoto: photoUrl
          }));
        }
      } catch {}

      // 2. Backup to dedicated storage keys
      if (photoUrl) {
        safeStorage.setItem(`pplg3_foto_${student.id}`, photoUrl);
        if (student.nisn) safeStorage.setItem(`pplg3_foto_nisn_${student.nisn}`, photoUrl);
      } else {
        safeStorage.removeItem(`pplg3_foto_${student.id}`);
        if (student.nisn) safeStorage.removeItem(`pplg3_foto_nisn_${student.nisn}`);
      }

      dataStore.addLog('LOGIN', `Siswa ${student.nama} memperbarui foto profil pribadi`);

      // 3. Supabase sync if connected
      if (isSupabaseConfigured) {
        try {
          supabase
            .from('students')
            .update({ foto_url: photoUrl })
            .or(`id.eq.${student.id},nisn.eq.${student.nisn},email.eq.${student.email}`)
            .then(({ error }) => {
              if (error) console.warn('Supabase photo sync error:', error);
            });
        } catch (e) {
          console.warn('Supabase sync exception:', e);
        }
      }
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

    // 2. Check for Student Login (Email akun kelas atau NISN + NISN siswa sebagai password)
    let foundStudent = dataStore.getStudentByEmail(cleanEmail) || dataStore.getStudentByNisn(cleanEmail);

    if (!foundStudent && isSupabaseConfigured) {
      await dataStore.syncWithSupabase();
      foundStudent = dataStore.getStudentByEmail(cleanEmail) || dataStore.getStudentByNisn(cleanEmail);
    }

    if (!foundStudent) {
      return { 
        success: false, 
        message: 'Email atau NISN siswa tidak ditemukan. Pastikan data kamu telah didaftarkan oleh Admin.' 
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
      studentData: foundStudent,
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

