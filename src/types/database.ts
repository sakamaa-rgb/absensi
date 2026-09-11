export type UserRole = 'admin' | 'student';

export type AttendanceStatus = 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'SAKIT' | 'ALPHA' | 'BELUM ABSEN';

export type SessionStatus = 'UPCOMING' | 'ACTIVE' | 'CLOSED';

export type ActivityAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'QR_SCANNED'
  | 'QR_EXPIRED'
  | 'LOCATION_CHECKED'
  | 'LOCATION_REJECTED'
  | 'DEVICE_CHECKED'
  | 'DEVICE_REJECTED'
  | 'FACE_VERIFIED'
  | 'FACE_FAILED'
  | 'ATTENDANCE_SUCCESS'
  | 'ATTENDANCE_FAILED'
  | 'EXPORT_EXCEL'
  | 'EXPORT_PDF'
  | 'RESET_DEVICE'
  | 'ADMIN_SCAN_ATTENDANCE'
  | 'UPDATE_ATTENDANCE_STATUS';

export interface Profile {
  id: string;
  nama: string;
  role: UserRole;
  status: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  user_id?: string | null;
  nis: string;
  nisn: string;
  nomor_absen: number;
  nama: string;
  kelas: string;
  email: string;
  foto_url?: string | null;
  device_token?: string | null;
  device_info?: {
    userAgent?: string;
    platform?: string;
    screenResolution?: string;
    language?: string;
    registeredAt?: string;
  } | null;
  face_descriptor?: number[] | null;
  face_registered?: boolean;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceSession {
  id: string;
  nama_sesi: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  batas_terlambat: string;
  qr_expiry_seconds: number;
  latitude_sekolah: number;
  longitude_sekolah: number;
  radius_meter: number;
  face_verification_enabled: boolean;
  status: SessionStatus;
  created_at?: string;
}

export interface QrToken {
  id: string;
  session_id: string;
  student_id?: string | null;
  token: string;
  created_at: string;
  expires_at: string;
  used_at?: string | null;
  status: 'valid' | 'used' | 'expired';
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_id: string;
  tanggal: string;
  waktu: string;
  status: AttendanceStatus;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  distance?: number | null;
  device_token?: string | null;
  face_verified: boolean;
  attendance_code: string;
  keterangan?: string | null;
  verified_by_admin?: string | null;
  created_at: string;
  // Joined relation fields
  student?: Student;
  session?: AttendanceSession;
}

export interface ActivityLog {
  id: string;
  user_id?: string | null;
  action: ActivityAction;
  description?: string;
  device_info?: any;
  created_at: string;
  user_nama?: string;
}

export interface SystemSettings {
  school_name: string;
  class_name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  default_qr_expiry_seconds: number;
  late_threshold_time: string;
  face_verification_default: boolean;
}
