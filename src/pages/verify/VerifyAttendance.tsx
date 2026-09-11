import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { dataStore } from '../../services/dataStore';
import type { AttendanceRecord } from '../../types/database';
import { StatusBadge } from '../../components/attendance/StatusBadge';
import { AnimatedBackground } from '../../components/common/AnimatedBackground';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowLeft,
  Search
} from 'lucide-react';

export const VerifyAttendance: React.FC = () => {
  const { attendanceId } = useParams<{ attendanceId?: string }>();
  const [searchCode, setSearchCode] = useState(attendanceId || '');
  const [record, setRecord] = useState<AttendanceRecord | null>(() => {
    return attendanceId ? (dataStore.getAttendanceByIdOrCode(attendanceId) || null) : null;
  });
  const [searched, setSearched] = useState(!!attendanceId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    const found = dataStore.getAttendanceByIdOrCode(searchCode.trim());
    setRecord(found || null);
    setSearched(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Animated Clean Background */}
      <AnimatedBackground />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3 shadow-xs">
            <img src="/logo-pplg3.png" alt="Logo XI PPLG 3" className="w-4 h-4 object-contain rounded" />
            <span>PPLG 3 Smart Attendance Verification</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-heading tracking-tight">
            Verifikasi Bukti Digital Kehadiran
          </h1>
          <p className="text-xs text-slate-500 mt-1">SMKN 1 Ciomas • Kelas XI PPLG 3</p>
        </div>

        {/* Search Bar if not verified yet or manual lookup */}
        <div className="glass-card rounded-2xl p-4 border border-slate-200 shadow-sm bg-white/90">
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Masukkan Attendance ID (cth: ATT-...)"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Cek
            </button>
          </form>
        </div>

        {record ? (
          /* VERIFIED STATE */
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-emerald-300 shadow-xl shadow-emerald-500/10 space-y-6 bg-white/95">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-black text-slate-900 font-heading tracking-wide">
                ATTENDANCE VERIFIED ✓
              </h2>
              <p className="text-xs text-emerald-700 font-medium">
                Catatan absensi ini ASLI dan terdaftar resmi di database sistem.
              </p>
            </div>

            {/* Public Verified Attributes */}
            <div className="py-2 divide-y divide-slate-100 text-xs space-y-3">
              <div className="flex items-center justify-between pt-3">
                <span className="text-slate-500">Nama Siswa</span>
                <span className="font-bold text-slate-900 text-sm">{record.student?.nama || '-'}</span>
              </div>

              <div className="flex items-center justify-between pt-3">
                <span className="text-slate-500">Nomor Absen / Kelas</span>
                <span className="font-semibold text-slate-700">
                  Absen #{record.student?.nomor_absen} • XI PPLG 3
                </span>
              </div>

              <div className="flex items-center justify-between pt-3">
                <span className="text-slate-500">Tanggal & Jam</span>
                <span className="font-semibold text-slate-700">{record.tanggal} • {record.waktu} WIB</span>
              </div>

              <div className="flex items-center justify-between pt-3">
                <span className="text-slate-500">Status Kehadiran</span>
                <StatusBadge status={record.status} size="sm" />
              </div>

              <div className="flex items-center justify-between pt-3">
                <span className="text-slate-500">Attendance ID</span>
                <span className="font-mono text-xs font-bold text-blue-600">{record.attendance_code}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 text-center">
              Sistem Absensi Digital Mandiri & Terpusat XI PPLG 3 SMKN 1 Ciomas
            </div>
          </div>
        ) : searched ? (
          /* NOT FOUND / INVALID */
          <div className="glass-card rounded-3xl p-8 border border-rose-200 text-center space-y-4 bg-white/95 shadow-lg">
            <XCircle className="w-14 h-14 text-rose-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900 font-heading">
              BUKTI ABSENSI TIDAK DITEMUKAN
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kode absensi <strong>"{searchCode}"</strong> tidak ditemukan dalam database atau telah kadaluarsa/dibatalkan.
            </p>
          </div>
        ) : null}

        <div className="text-center pt-2">
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-blue-600 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda Utama</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
