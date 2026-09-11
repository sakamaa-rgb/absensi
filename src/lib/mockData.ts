import { Student, AttendanceSession, SystemSettings } from '../types/database';

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_SETTINGS: SystemSettings = {
  school_name: 'SMKN 1 Ciomas',
  class_name: 'XI PPLG 3',
  latitude: -6.6025000,
  longitude: 106.7584000,
  radius_meters: 100,
  default_qr_expiry_seconds: 30,
  late_threshold_time: '06:45',
  face_verification_default: false,
};

export const INITIAL_SESSION: AttendanceSession = {
  id: 'ses-default-today',
  nama_sesi: 'Absensi Pagi - XI PPLG 3',
  tanggal: new Date().toISOString().split('T')[0],
  jam_mulai: '06:30',
  jam_selesai: '07:30',
  batas_terlambat: '06:45',
  qr_expiry_seconds: 30,
  latitude_sekolah: -6.6025000,
  longitude_sekolah: 106.7584000,
  radius_meter: 100,
  face_verification_enabled: false,
  status: 'ACTIVE',
  created_at: new Date().toISOString(),
};
