import { Student, AttendanceSession, SystemSettings } from '../types/database';

export const INITIAL_STUDENTS: Student[] = [
  {
    id: '9eda64e6-e445-4d49-aaf2-73a84851f247',
    nama: 'Muhammad Rajib Zahir (26)',
    nis: '232410001',
    nisn: '102828715',
    nomor_absen: 1,
    kelas: 'XI PPLG 3',
    email: 'rajibjugi02@gmail.com',
    status: 'active',
    created_at: '2026-09-11T16:00:39.932672+00:00',
  },
  {
    id: 'f86cdbe8-7cc6-4534-b1ea-fd158e746b56',
    nama: 'Revand Aqila Al Hafiz',
    nis: '232410003',
    nisn: '106735707',
    nomor_absen: 3,
    kelas: 'XI PPLG 3',
    email: '11lymi1overs@gmail.com',
    status: 'active',
    created_at: '2026-09-11T16:00:58.165174+00:00',
  },
];

export const INITIAL_SETTINGS: SystemSettings = {
  school_name: 'SMKN 1 Ciomas',
  class_name: 'XI PPLG 3',
  latitude: -6.6025000,
  longitude: 106.7584000,
  radius_meters: 100,
  default_qr_expiry_seconds: 30,
  late_threshold_time: '06:30',
  face_verification_default: true,
};

export const INITIAL_SESSION: AttendanceSession = {
  id: 'd8a7c39a-8bd1-4fad-a72f-b2ccdca03b58',
  nama_sesi: 'Absensi Pagi - XI PPLG 3',
  tanggal: new Date().toISOString().split('T')[0],
  jam_mulai: '06:30',
  jam_selesai: '07:30',
  batas_terlambat: '06:30',
  qr_expiry_seconds: 30,
  latitude_sekolah: -6.6025000,
  longitude_sekolah: 106.7584000,
  radius_meter: 100,
  face_verification_enabled: false,
  status: 'ACTIVE',
  created_at: '2026-09-11T15:03:29.951095+00:00',
};
