import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

// Layouts
import { StudentLayout } from '../layouts/StudentLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// Landing & Auth
import { LandingPage } from '../pages/landing/LandingPage';
import { Login } from '../pages/auth/Login';

// Student Pages
import { StudentDashboard } from '../pages/student/StudentDashboard';
import { StudentScan } from '../pages/student/StudentScan';
import { StudentHistory } from '../pages/student/StudentHistory';
import { StudentProfile } from '../pages/student/StudentProfile';
import { StudentAttendanceProof } from '../pages/student/StudentAttendanceProof';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AdminScanStudent } from '../pages/admin/AdminScanStudent';
import { AdminStudents } from '../pages/admin/AdminStudents';
import { AdminAttendance } from '../pages/admin/AdminAttendance';
import { AdminSessions } from '../pages/admin/AdminSessions';
import { AdminReports } from '../pages/admin/AdminReports';
import { AdminLogs } from '../pages/admin/AdminLogs';
import { AdminSettings } from '../pages/admin/AdminSettings';

// Public Verification Page
import { VerifyAttendance } from '../pages/verify/VerifyAttendance';

// Protected Route wrappers
const StudentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/student/dashboard" replace />;
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />

      {/* Public Attendance Verification */}
      <Route path="/verify" element={<VerifyAttendance />} />
      <Route path="/verify/:attendanceId" element={<VerifyAttendance />} />

      {/* Student Routes */}
      <Route
        path="/student"
        element={
          <StudentRoute>
            <StudentLayout />
          </StudentRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="scan" element={<StudentScan />} />
        <Route path="history" element={<StudentHistory />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="attendance/:id" element={<StudentAttendanceProof />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="scan" element={<AdminScanStudent />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="sessions" element={<AdminSessions />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="logs" element={<AdminLogs />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
