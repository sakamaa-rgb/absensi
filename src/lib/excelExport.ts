// Excel & CSV Export Helper using SheetJS (xlsx)
import * as XLSX from 'xlsx';
import { AttendanceRecord } from '../types/database';

export function exportAttendanceToExcel(
  records: AttendanceRecord[],
  filenamePrefix = 'Laporan_Absensi_XI_PPLG_3'
) {
  const rows = records.map((rec, index) => ({
    'No': index + 1,
    'Nomor Absen': rec.student?.nomor_absen ?? '-',
    'NIS': rec.student?.nis ?? '-',
    'Nama': rec.student?.nama ?? '-',
    'Kelas': rec.student?.kelas ?? 'XI PPLG 3',
    'Tanggal': rec.tanggal,
    'Sesi': rec.session?.nama_sesi ?? 'Absensi Pagi',
    'Jam Absen': rec.waktu || '-',
    'Status': rec.status,
    'Latitude': rec.latitude ?? '-',
    'Longitude': rec.longitude ?? '-',
    'Akurasi GPS (m)': rec.accuracy ? `±${Math.round(rec.accuracy)}m` : '-',
    'Jarak dari Sekolah (m)': rec.distance ? `${Math.round(rec.distance)}m` : '-',
    'Device Status': rec.device_token ? 'Verified' : '-',
    'Face Verification': rec.face_verified ? 'Verified' : 'N/A',
    'Attendance ID': rec.attendance_code,
    'Keterangan': rec.keterangan || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for clean readability
  const colWidths = [
    { wch: 5 },  // No
    { wch: 12 }, // Nomor Absen
    { wch: 12 }, // NIS
    { wch: 25 }, // Nama
    { wch: 12 }, // Kelas
    { wch: 12 }, // Tanggal
    { wch: 22 }, // Sesi
    { wch: 12 }, // Jam Absen
    { wch: 12 }, // Status
    { wch: 14 }, // Latitude
    { wch: 14 }, // Longitude
    { wch: 16 }, // Akurasi GPS
    { wch: 20 }, // Jarak dari Sekolah
    { wch: 14 }, // Device Status
    { wch: 18 }, // Face Verification
    { wch: 20 }, // Attendance ID
    { wch: 30 }, // Keterangan
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Absensi XI PPLG 3');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${todayStr}.xlsx`);
}

export function exportAttendanceToCSV(
  records: AttendanceRecord[],
  filenamePrefix = 'Laporan_Absensi_XI_PPLG_3'
) {
  const rows = records.map((rec, index) => ({
    'No': index + 1,
    'Nomor Absen': rec.student?.nomor_absen ?? '-',
    'NIS': rec.student?.nis ?? '-',
    'Nama': rec.student?.nama ?? '-',
    'Kelas': rec.student?.kelas ?? 'XI PPLG 3',
    'Tanggal': rec.tanggal,
    'Sesi': rec.session?.nama_sesi ?? 'Absensi Pagi',
    'Jam Absen': rec.waktu || '-',
    'Status': rec.status,
    'Attendance ID': rec.attendance_code,
    'Keterangan': rec.keterangan || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
