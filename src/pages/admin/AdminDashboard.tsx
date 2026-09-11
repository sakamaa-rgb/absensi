import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dataStore } from '../../services/dataStore';
import type { Student, AttendanceRecord, AttendanceSession } from '../../types/database';
import { StatusBadge } from '../../components/attendance/StatusBadge';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  FileText, 
  HeartHandshake, 
  AlertOctagon, 
  HelpCircle, 
  ScanLine, 
  Radio, 
  Maximize2, 
  ArrowRight, 
  Activity 
} from 'lucide-react';


export const AdminDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activeSession, setActiveSession] = useState<AttendanceSession | undefined>();
  const [recentLogs, setRecentLogs] = useState(dataStore.getLogs().slice(0, 5));

  useEffect(() => {
    const refreshData = () => {
      setStudents(dataStore.getStudents());
      setAttendance(dataStore.getAttendance());
      setActiveSession(dataStore.getActiveSession());
      setRecentLogs(dataStore.getLogs().slice(0, 5));
    };

    refreshData();
    return dataStore.subscribe(refreshData);
  }, []);

  // Compute today's stats
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.tanggal === today);

  const totalStudents = students.length;
  const hadirCount = todayAttendance.filter(a => a.status === 'HADIR').length;
  const terlambatCount = todayAttendance.filter(a => a.status === 'TERLAMBAT').length;
  const izinCount = todayAttendance.filter(a => a.status === 'IZIN').length;
  const sakitCount = todayAttendance.filter(a => a.status === 'SAKIT').length;
  const alphaCount = todayAttendance.filter(a => a.status === 'ALPHA').length;
  const attendedStudentIds = new Set(todayAttendance.map(a => a.student_id));
  const belumAbsenCount = Math.max(0, totalStudents - attendedStudentIds.size);

  const attendanceRate = totalStudents > 0 
    ? Math.round(((hadirCount + terlambatCount) / totalStudents) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-2 shadow-xs">
            <Radio className="w-3.5 h-3.5 animate-pulse text-blue-600" />
            <span>Panel Ketua Kelas & Admin XI PPLG 3</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
            Dashboard Absensi Kelas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitoring kehadiran siswa XI PPLG 3 SMKN 1 Ciomas secara realtime
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex items-center space-x-2.5">
          <Link
            to="/admin/scan"
            className="flex items-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan Siswa di Kelas</span>
          </Link>

          <Link
            to="/admin/sessions"
            className="flex items-center space-x-2 py-2.5 px-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-all"
          >
            <Maximize2 className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Buka Proyektor QR</span>
          </Link>
        </div>
      </div>

      {/* 45 Students Attendance Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        {/* Total Siswa */}
        <div className="glass-card rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-1 bg-white/95">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">TOTAL SISWA</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-heading">{totalStudents}</p>
          <span className="text-[10px] text-slate-400 font-medium">Target 45 Siswa</span>
        </div>

        {/* Hadir */}
        <div className="glass-card rounded-2xl p-4 border border-emerald-200 shadow-xs space-y-1 bg-emerald-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase">HADIR</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 font-heading">{hadirCount}</p>
          <span className="text-[10px] text-emerald-600/80 font-medium">Tepat Waktu</span>
        </div>

        {/* Terlambat */}
        <div className="glass-card rounded-2xl p-4 border border-amber-200 shadow-xs space-y-1 bg-amber-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase">TERLAMBAT</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600 font-heading">{terlambatCount}</p>
          <span className="text-[10px] text-amber-600/80 font-medium">&gt; 06:45 WIB</span>
        </div>

        {/* Izin */}
        <div className="glass-card rounded-2xl p-4 border border-blue-200 shadow-xs space-y-1 bg-blue-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase">IZIN</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-600 font-heading">{izinCount}</p>
          <span className="text-[10px] text-blue-600/80 font-medium">Surat Keterangan</span>
        </div>

        {/* Sakit */}
        <div className="glass-card rounded-2xl p-4 border border-purple-200 shadow-xs space-y-1 bg-purple-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 uppercase">SAKIT</span>
            <HeartHandshake className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-600 font-heading">{sakitCount}</p>
          <span className="text-[10px] text-purple-600/80 font-medium">Surat Dokter</span>
        </div>

        {/* Alpha */}
        <div className="glass-card rounded-2xl p-4 border border-rose-200 shadow-xs space-y-1 bg-rose-50/50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase">ALPHA</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-600 font-heading">{alphaCount}</p>
          <span className="text-[10px] text-rose-600/80 font-medium">Tanpa Keterangan</span>
        </div>

        {/* Belum Absen */}
        <div className="glass-card rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-1 col-span-2 sm:col-span-1 bg-white/95">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">BELUM ABSEN</span>
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-700 font-heading">{belumAbsenCount}</p>
          <span className="text-[10px] text-slate-400 font-medium">Sisa Siswa</span>
        </div>
      </div>

      {/* Two Column Layout: Active Session + Quick Scan Highlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Session Card */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4 bg-white/95">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h2 className="text-sm font-bold text-slate-900 font-heading uppercase tracking-wide">
                SESI ABSENSI HARI INI
              </h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              {activeSession?.status || 'ACTIVE'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">
                {activeSession?.nama_sesi || 'Absensi Pagi - XI PPLG 3'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Waktu: {activeSession?.jam_mulai || '06:30'} - {activeSession?.jam_selesai || '07:30'} WIB • Batas Terlambat: {activeSession?.batas_terlambat || '06:45'} WIB
              </p>
              <p className="text-xs text-blue-600 font-medium mt-1">
                Lokasi: SMKN 1 Ciomas (Radius: {activeSession?.radius_meter || 100} meter) • QR Lifetime: {activeSession?.qr_expiry_seconds || 30} detik
              </p>
            </div>

            <Link
              to="/admin/sessions"
              className="self-start sm:self-center py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 flex items-center space-x-2 shadow-xs transition-all"
            >
              <span>Proyektor Layar Kelas</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Progress Bar of Attendance Rate */}
          <div className="pt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Persentase Kehadiran:</span>
              <span className="font-bold text-emerald-600">{attendanceRate}% ({hadirCount + terlambatCount}/{totalStudents} Siswa)</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 border border-slate-200/80 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Ketua Kelas Direct Scanner Prompt Card */}
        <div className="glass-card rounded-3xl p-6 border border-indigo-100 shadow-sm space-y-4 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-xs">
            <ScanLine className="w-6 h-6" />
          </div>

          <div>
            <span className="text-[10px] text-indigo-700 uppercase font-bold tracking-wider">
              FITUR KETUA KELAS
            </span>
            <h3 className="text-base font-bold text-slate-900 font-heading mt-0.5">
              Scan Siswa di Kelas
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Ketua Kelas atau Admin dapat membuka kamera untuk meng-scan QR kartu/aplikasi siswa secara bergiliran saat siswa masuk ke kelas.
            </p>
          </div>

          <Link
            to="/admin/scan"
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
          >
            <span>Mulai Scan Siswa</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Recent Attendance Records & Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Table Preview */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4 bg-white/95">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 font-heading">
              Absensi Masuk Terkini ({todayAttendance.length} Siswa)
            </h3>
            <Link
              to="/admin/attendance"
              className="text-xs text-blue-600 hover:text-blue-700 font-bold"
            >
              Lihat Semua & Ubah Status &rarr;
            </Link>
          </div>

          {todayAttendance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2.5 font-bold">Abs</th>
                    <th className="pb-2.5 font-bold">Nama Siswa</th>
                    <th className="pb-2.5 font-bold">Jam</th>
                    <th className="pb-2.5 font-bold">Status</th>
                    <th className="pb-2.5 font-bold">Jarak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayAttendance.slice(0, 7).map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 font-mono font-semibold text-slate-500">
                        #{rec.student?.nomor_absen || '-'}
                      </td>
                      <td className="py-2.5 font-semibold text-slate-800">
                        {rec.student?.nama || '-'}
                      </td>
                      <td className="py-2.5 font-mono text-slate-500">
                        {rec.waktu}
                      </td>
                      <td className="py-2.5">
                        <StatusBadge status={rec.status} size="sm" />
                      </td>
                      <td className="py-2.5 text-emerald-600 font-semibold">
                        {rec.distance ? `${Math.round(rec.distance)}m` : '0m'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              Belum ada siswa yang melakukan absensi hari ini.
            </div>
          )}
        </div>

        {/* Activity Logs Stream */}
        <div className="glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4 bg-white/95">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 font-heading">Aktivitas Sistem</h3>
            </div>
            <Link
              to="/admin/logs"
              className="text-xs text-blue-600 hover:text-blue-700 font-bold"
            >
              Audit Log
            </Link>
          </div>

          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-blue-600">{log.action}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-700 text-[11px] leading-snug">{log.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
