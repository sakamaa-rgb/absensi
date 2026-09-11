import React, { useState, useEffect } from 'react';
import { dataStore } from '../../services/dataStore';
import type { AttendanceRecord, AttendanceSession, Student } from '../../types/database';
import { exportAttendanceToExcel, exportAttendanceToCSV } from '../../lib/excelExport';
import { exportAttendanceToPDF, type ReportSummaryStats } from '../../lib/pdfExport';
import { StatusBadge } from '../../components/attendance/StatusBadge';
import { 
  FileSpreadsheet, 
  FileText, 
  Filter, 
  ShieldCheck 
} from 'lucide-react';


export const AdminReports: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);

  // Filters
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedSession, setSelectedSession] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  useEffect(() => {
    const refresh = () => {
      setAttendance(dataStore.getAttendance());
      setStudents(dataStore.getStudents());
      setSessions(dataStore.getSessions());
    };
    refresh();
    return dataStore.subscribe(refresh);
  }, []);

  // Filter attendance records by date range, session, and status
  const filteredRecords = attendance.filter((rec) => {
    if (rec.tanggal < startDate || rec.tanggal > endDate) return false;
    if (selectedSession !== 'ALL' && rec.session_id !== selectedSession) return false;
    if (selectedStatus !== 'ALL' && rec.status !== selectedStatus) return false;
    return true;
  });

  // Calculate summary stats
  const totalStudents = students.length || 45;
  const hadir = filteredRecords.filter(r => r.status === 'HADIR').length;
  const terlambat = filteredRecords.filter(r => r.status === 'TERLAMBAT').length;
  const izin = filteredRecords.filter(r => r.status === 'IZIN').length;
  const sakit = filteredRecords.filter(r => r.status === 'SAKIT').length;
  const alpha = filteredRecords.filter(r => r.status === 'ALPHA').length;
  const attendedIds = new Set(filteredRecords.map(r => r.student_id));
  const belumAbsen = Math.max(0, totalStudents - attendedIds.size);

  const stats: ReportSummaryStats = {
    periode: `${startDate} s/d ${endDate}`,
    tanggal: startDate === endDate ? startDate : `${startDate} s/d ${endDate}`,
    sesi: selectedSession === 'ALL' ? 'Semua Sesi' : (sessions.find(s => s.id === selectedSession)?.nama_sesi || 'Sesi Terpilih'),
    totalSiswa: totalStudents,
    hadir,
    terlambat,
    izin,
    sakit,
    alpha,
    belumAbsen,
  };

  const handleExportExcel = () => {
    exportAttendanceToExcel(filteredRecords, `Laporan_Absensi_XI_PPLG_3_${startDate}`);
    dataStore.addLog('EXPORT_EXCEL', `Admin mengekspor laporan absensi Excel (${filteredRecords.length} data)`);
  };

  const handleExportCSV = () => {
    exportAttendanceToCSV(filteredRecords, `Laporan_Absensi_XI_PPLG_3_${startDate}`);
    dataStore.addLog('EXPORT_EXCEL', `Admin mengekspor laporan absensi CSV (${filteredRecords.length} data)`);
  };

  const handleExportPDF = () => {
    exportAttendanceToPDF(filteredRecords, stats, 'LAPORAN ABSENSI SISWA');
    dataStore.addLog('EXPORT_PDF', `Admin mengekspor laporan absensi resmi PDF (${filteredRecords.length} data)`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-2 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Fitur Khusus Admin / Wali Kelas</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
          Laporan & Export Absensi
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Generate dan unduh rekap kehadiran 45 siswa XI PPLG 3 dalam format Excel dan PDF resmi
        </p>
      </div>

      {/* Filter Card */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm bg-white/95 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center">
          <Filter className="w-4 h-4 mr-1.5 text-blue-600" />
          Filter Periode & Kriteria Laporan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Tanggal Awal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full glass-input rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Tanggal Akhir</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full glass-input rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Sesi Absensi</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full glass-input rounded-xl p-2.5"
            >
              <option value="ALL">Semua Sesi</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.nama_sesi}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Status Kehadiran</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full glass-input rounded-xl p-2.5"
            >
              <option value="ALL">Semua Status</option>
              <option value="HADIR">HADIR</option>
              <option value="TERLAMBAT">TERLAMBAT</option>
              <option value="IZIN">IZIN</option>
              <option value="SAKIT">SAKIT</option>
              <option value="ALPHA">ALPHA</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Preview Box */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm bg-white/95 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-heading">
              Preview Data ({filteredRecords.length} Catatan Absensi Ditemukan)
            </h3>
            <p className="text-xs text-slate-500">
              Periode: {stats.periode} • Total Kelas: 45 Siswa
            </p>
          </div>

          {/* Export Action Buttons (ONLY ADMIN) */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
            >
              <span>CSV</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="flex items-center space-x-1.5 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>PDF Resmi (.pdf)</span>
            </button>
          </div>
        </div>

        {/* Summary Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center shadow-xs">
            <span className="text-[10px] text-emerald-700 font-bold uppercase block">Hadir</span>
            <span className="text-xl font-black text-emerald-600">{hadir}</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center shadow-xs">
            <span className="text-[10px] text-amber-700 font-bold uppercase block">Terlambat</span>
            <span className="text-xl font-black text-amber-600">{terlambat}</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-center shadow-xs">
            <span className="text-[10px] text-blue-700 font-bold uppercase block">Izin</span>
            <span className="text-xl font-black text-blue-600">{izin}</span>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-center shadow-xs">
            <span className="text-[10px] text-purple-700 font-bold uppercase block">Sakit</span>
            <span className="text-xl font-black text-purple-600">{sakit}</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-center shadow-xs">
            <span className="text-[10px] text-rose-700 font-bold uppercase block">Alpha</span>
            <span className="text-xl font-black text-rose-600">{alpha}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-center shadow-xs">
            <span className="text-[10px] text-slate-600 font-bold uppercase block">Belum Absen</span>
            <span className="text-xl font-black text-slate-700">{belumAbsen}</span>
          </div>
        </div>

        {/* Data Table Preview */}
        <div className="overflow-x-auto max-h-96 pt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 sticky top-0">
                <th className="py-2.5 px-3 font-bold text-center w-12">No</th>
                <th className="py-2.5 px-3 font-bold text-center w-12">Abs</th>
                <th className="py-2.5 px-3 font-bold">Nama Siswa</th>
                <th className="py-2.5 px-3 font-bold font-mono">NIS</th>
                <th className="py-2.5 px-3 font-bold">Tanggal</th>
                <th className="py-2.5 px-3 font-bold">Jam</th>
                <th className="py-2.5 px-3 font-bold">Status</th>
                <th className="py-2.5 px-3 font-bold">Jarak GPS</th>
                <th className="py-2.5 px-3 font-bold">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((rec, idx) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-900 font-mono">
                    #{rec.student?.nomor_absen || '-'}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {rec.student?.nama || '-'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {rec.student?.nis || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{rec.tanggal}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">{rec.waktu}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={rec.status} size="sm" />
                  </td>
                  <td className="py-2.5 px-3 text-emerald-600 font-semibold font-mono">
                    {rec.distance ? `${Math.round(rec.distance)}m` : '0m'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{rec.keterangan || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
