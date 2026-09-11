import React, { useState, useEffect } from 'react';
import { dataStore } from '../../services/dataStore';
import type { AttendanceRecord, AttendanceStatus, Student, AttendanceSession } from '../../types/database';
import { exportAttendanceToExcel } from '../../lib/excelExport';
import { exportAttendanceToPDF, type ReportSummaryStats } from '../../lib/pdfExport';
import { StatusBadge } from '../../components/attendance/StatusBadge';
import { 
  Search, 
  Calendar, 
  MapPin,
  Smartphone,
  FileSpreadsheet,
  FileText
} from 'lucide-react';


export const AdminAttendance: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('ALL');

  useEffect(() => {
    const refresh = () => {
      setAttendance(dataStore.getAttendance());
      setStudents(dataStore.getStudents());
      setSessions(dataStore.getSessions());
    };
    refresh();
    return dataStore.subscribe(refresh);
  }, []);

  // Combine full students with their attendance record for the selected date
  const combinedData = students.map((std) => {
    const record = attendance.find(
      (a) => a.student_id === std.id && a.tanggal === selectedDate
    );
    return {
      student: std,
      record,
      status: (record?.status || 'BELUM ABSEN') as AttendanceStatus,
    };
  });

  // Apply filters
  const filtered = combinedData.filter(({ student, record, status }) => {
    // Status filter
    if (selectedStatus !== 'ALL' && status !== selectedStatus) return false;

    // Session filter
    if (selectedSessionId !== 'ALL' && record && record.session_id !== selectedSessionId) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = student.nama.toLowerCase().includes(q);
      const matchNis = student.nis.includes(q);
      const matchAbsen = String(student.nomor_absen).includes(q);
      return matchName || matchNis || matchAbsen;
    }

    return true;
  });

  // Export functions (Only Excel and PDF as requested)
  const getExportableRecords = (): AttendanceRecord[] => {
    return filtered.map(({ student, record, status }) => {
      if (record) return record;
      return {
        id: `virtual-${student.id}-${selectedDate}`,
        student_id: student.id,
        session_id: selectedSessionId !== 'ALL' ? selectedSessionId : (sessions[0]?.id || 'ses-1'),
        tanggal: selectedDate,
        waktu: '-',
        status: status,
        distance: null,
        keterangan: status === 'BELUM ABSEN' ? 'Belum absen' : '-',
        face_verified: false,
        attendance_code: '-',
        created_at: new Date().toISOString(),
        student: student,
      };
    });
  };

  const handleExportExcel = () => {
    const records = getExportableRecords();
    exportAttendanceToExcel(records, `Data_Absensi_XI_PPLG_3_${selectedDate}`);
    dataStore.addLog('EXPORT_EXCEL', `Admin mengekspor data absensi tanggal ${selectedDate} ke Excel (${records.length} data)`);
  };

  const handleExportPDF = () => {
    const records = getExportableRecords();
    const stats: ReportSummaryStats = {
      periode: selectedDate,
      tanggal: selectedDate,
      sesi: selectedSessionId === 'ALL' ? 'Semua Sesi' : (sessions.find(s => s.id === selectedSessionId)?.nama_sesi || 'Sesi Terpilih'),
      totalSiswa: students.length || 45,
      hadir: filtered.filter(f => f.status === 'HADIR').length,
      terlambat: filtered.filter(f => f.status === 'TERLAMBAT').length,
      izin: filtered.filter(f => f.status === 'IZIN').length,
      sakit: filtered.filter(f => f.status === 'SAKIT').length,
      alpha: filtered.filter(f => f.status === 'ALPHA').length,
      belumAbsen: filtered.filter(f => f.status === 'BELUM ABSEN').length,
    };

    exportAttendanceToPDF(records, stats, `REKAP KEHADIRAN SISWA - ${selectedDate}`);
    dataStore.addLog('EXPORT_PDF', `Admin mengekspor data absensi tanggal ${selectedDate} ke PDF (${records.length} data)`);
  };

  return (
    <div className="space-y-6">
      {/* Header with Export buttons only */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
            Data & Rekap Absensi Siswa
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitoring kehadiran siswa secara realtime • Ekspor resmi ke Excel (.xlsx) dan PDF
          </p>
        </div>

        {/* Date Selector & Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs text-xs flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Export Rekap Absensi ke Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Export Rekap Absensi Resmi ke PDF (.pdf)"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-200/90 shadow-xs bg-white/95 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama siswa, no absen, atau NIS..."
              className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2 text-xs"
            />
          </div>

          {/* Session filter */}
          <div>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs cursor-pointer"
            >
              <option value="ALL">Semua Sesi Absensi</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.nama_sesi}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pill Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-transparent">
          {['ALL', 'HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPHA', 'BELUM ABSEN'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedStatus === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              {st === 'ALL' ? `Semua (${students.length} Siswa)` : st}
            </button>
          ))}
        </div>
      </div>

      {/* Table (Strictly view & export, no manual edit) */}
      <div className="glass-card rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden bg-white/95">
        <div className="overflow-x-auto scrollbar-transparent">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                <th className="py-3 px-3 font-bold text-center w-12">No</th>
                <th className="py-3 px-3 font-bold text-center w-12">Abs</th>
                <th className="py-3 px-3 font-bold">Nama Siswa</th>
                <th className="py-3 px-3 font-bold font-mono">NIS</th>
                <th className="py-3 px-3 font-bold">Jam Absen</th>
                <th className="py-3 px-3 font-bold">Status</th>
                <th className="py-3 px-3 font-bold">Lokasi / Jarak</th>
                <th className="py-3 px-3 font-bold">Device</th>
                <th className="py-3 px-3 font-bold">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(({ student, record, status }, idx) => (
                <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-center text-slate-400 font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                    #{student.nomor_absen}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    {student.nama}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">
                    {student.nis}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {record?.waktu || '-'}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={status} size="sm" />
                  </td>
                  <td className="py-3 px-3">
                    {record?.distance !== undefined && record?.distance !== null ? (
                      <span className="text-emerald-600 font-semibold flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {Math.round(record.distance)}m
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {record?.device_token ? (
                      <span className="text-indigo-600 font-semibold flex items-center">
                        <Smartphone className="w-3 h-3 mr-1" />
                        Verified
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                    {record?.keterangan || (status === 'BELUM ABSEN' ? 'Belum absen' : '-')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
