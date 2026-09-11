import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { dataStore } from '../../services/dataStore';
import type { AttendanceRecord } from '../../types/database';
import { StatusBadge } from '../../components/attendance/StatusBadge';
import { QRCodeSVG } from 'qrcode.react';
import { EditProfilePhotoModal } from '../../components/student/EditProfilePhotoModal';
import { 
  QrCode, 
  MapPin, 
  Clock, 
  Smartphone, 
  Calendar, 
  ChevronRight, 
  IdCard, 
  ShieldCheck, 
  AlertCircle,
  UserCheck,
  Camera
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { student, updateStudentPhoto } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [activeSession, setActiveSession] = useState(dataStore.getActiveSession());
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    if (!student) return;

    const refresh = () => {
      const today = new Date().toISOString().split('T')[0];
      const records = dataStore.getAttendanceByStudent(student.id);
      const todayRec = records.find(r => r.tanggal === today);
      setTodayRecord(todayRec || null);
      setActiveSession(dataStore.getActiveSession());
    };

    refresh();
    return dataStore.subscribe(refresh);
  }, [student]);

  const firstName = student?.nama ? student.nama.split(' ')[0] : 'Siswa';

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Hero Greeting Card with Student Photo */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden bg-white/95 hover-lift">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-100/50 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center space-x-4 sm:space-x-5">
            {/* Student Photo Avatar with Camera Button */}
            <div 
              onClick={() => setShowPhotoModal(true)}
              className="relative group cursor-pointer shrink-0 touch-press"
              title="Klik untuk ubah foto profil"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-blue-500/20 border-2 border-white group-hover:ring-4 group-hover:ring-blue-100 group-hover:scale-105 transition-all duration-300">
                {student?.foto_url ? (
                  <img src={student.foto_url} alt={student.nama} className="w-full h-full object-cover" />
                ) : (
                  <span>{student?.nama?.charAt(0) || 'S'}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-blue-600 text-white shadow-md group-hover:scale-115 transition-transform duration-200">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Sistem Absensi Digital Siswa</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-heading">
                Halo, {firstName} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {student?.nama} • Absen #{student?.nomor_absen || '-'} • XI PPLG 3
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto flex-wrap gap-y-2">
            <button
              onClick={() => setShowPhotoModal(true)}
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-700 text-xs font-bold transition-all shadow-xs cursor-pointer touch-press shimmer-hover hover-lift"
            >
              <Camera className="w-4 h-4 text-blue-600" />
              <span>Ubah Foto</span>
            </button>

            <button
              onClick={() => setShowIdCardModal(true)}
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer touch-press shimmer-hover hover-lift"
            >
              <IdCard className="w-4 h-4 text-blue-600" />
              <span>Kartu QR</span>
            </button>
          </div>
        </div>
      </div>

      {/* Big Action Button: BUKA KODE QR SAYA */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-sm opacity-25 group-hover:opacity-45 transition duration-300 pointer-events-none" />
        
        <Link
          to="/student/scan"
          className="relative w-full flex items-center justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl hover-lift shimmer-hover touch-press"
        >
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25 shadow-inner group-hover:scale-105 transition-transform duration-300">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-blue-200 block mb-0.5">
                Presensi Kelas XI PPLG 3
              </span>
              <span className="text-xl sm:text-2xl font-black font-heading tracking-wide">
                📱 BUKA KODE QR SAYA
              </span>
              <p className="text-xs text-blue-100/90 mt-1">
                Tunjukkan QR di HP kamu ke Ketua Kelas / Admin untuk discan
              </p>
            </div>
          </div>

          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center group-hover:translate-x-1.5 transition-transform duration-300">
            <ChevronRight className="w-6 h-6" />
          </div>
        </Link>
      </div>

      {/* Today's Attendance Card */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5 bg-white/95 hover-lift">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 font-heading">
              ABSENSI HARI INI
            </h2>
          </div>
          {todayRecord ? (
            <StatusBadge status={todayRecord.status} size="md" />
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
              BELUM ABSEN
            </span>
          )}
        </div>

        {todayRecord ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center text-xs text-slate-500 font-semibold">
                <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                <span>Jam Absen</span>
              </div>
              <p className="text-base font-bold text-slate-900 font-mono">
                {todayRecord.waktu} WIB
              </p>
              <p className="text-[11px] text-slate-500">{todayRecord.keterangan || 'Tervalidasi'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center text-xs text-slate-500 font-semibold">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                <span>Lokasi GPS Siswa</span>
              </div>
              <p className="text-base font-bold text-emerald-700 font-mono text-sm sm:text-base">
                {todayRecord.latitude && todayRecord.longitude
                  ? `${todayRecord.latitude.toFixed(4)}, ${todayRecord.longitude.toFixed(4)}`
                  : 'Koordinat Terverifikasi'}
              </p>
              <p className="text-[11px] text-slate-500">
                {todayRecord.distance !== undefined && todayRecord.distance !== null
                  ? `Jarak: ${Math.round(todayRecord.distance)}m dari titik sekolah`
                  : 'Sesuai titik koordinat siswa'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center text-xs text-slate-500 font-semibold">
                <Smartphone className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                <span>Status Device</span>
              </div>
              <p className="text-sm font-bold text-indigo-700 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" />
                Verified
              </p>
              <p className="text-[11px] text-slate-500">Perangkat Terdaftar</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center text-xs text-slate-500 font-semibold">
                <UserCheck className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                <span>Face Verification</span>
              </div>
              <p className="text-sm font-bold text-slate-800">
                {todayRecord.face_verified ? 'Verified' : 'N/A (Fitur Opsional)'}
              </p>
              <p className="text-[11px] text-slate-500">Validasi Biometrik</p>
            </div>

            <div className="sm:col-span-2 pt-2">
              <Link
                to={`/student/attendance/${todayRecord.id}`}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-700 font-bold text-xs border border-blue-200 transition-all"
              >
                <span>Lihat Bukti Digital Absensi & Download PDF</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2.5">
            <p className="text-xs font-semibold text-slate-600">
              Kamu belum melakukan absensi untuk sesi hari ini.
            </p>
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-700 flex-wrap gap-y-1">
              <span>Sesi: <strong className="text-blue-600 font-bold">{activeSession?.nama_sesi || 'Absensi Pagi'}</strong></span>
              <span>•</span>
              <span>Batas Masuk: <strong className="text-amber-600 font-bold">{activeSession?.batas_terlambat || '06:45'} WIB</strong></span>
              <span>•</span>
              <span>Validasi: <strong className="text-emerald-600 font-bold">Titik Koordinat Siswa</strong></span>
            </div>
            <p className="text-[11px] text-slate-500">
              Presensi mencatat titik koordinat lokasi real-time HP Anda saat menunjukkan QR ke Ketua Kelas / Admin.
            </p>
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/student/history"
          className="glass-card rounded-2xl p-5 border border-slate-200 transition-all group bg-white/90 shadow-xs hover-lift touch-press"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-blue-100">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 font-heading">Riwayat Absensi</h3>
          <p className="text-xs text-slate-500 mt-1">Lihat riwayat kehadiran lengkap kamu</p>
        </Link>

        <Link
          to="/student/profile"
          className="glass-card rounded-2xl p-5 border border-slate-200 transition-all group bg-white/90 shadow-xs hover-lift touch-press"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-indigo-100">
            <Smartphone className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 font-heading">Status Device</h3>
          <p className="text-xs text-slate-500 mt-1">Cek perangkat yang terdaftar di sistem</p>
        </Link>
      </div>

      {/* Student Digital QR Card Modal */}
      {showIdCardModal && student && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl text-center space-y-4 bg-white">
            {/* Student Photo or Icon */}
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl mx-auto shadow-md border-2 border-white">
              {student.foto_url ? (
                <img src={student.foto_url} alt={student.nama} className="w-full h-full object-cover" />
              ) : (
                <IdCard className="w-7 h-7 text-white" />
              )}
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900 font-heading">{student.nama}</h3>
              <p className="text-xs text-slate-500 font-medium">Absen #{student.nomor_absen} • XI PPLG 3</p>
              <p className="text-xs text-blue-600 font-mono font-bold mt-0.5">NIS: {student.nis}</p>
            </div>

            <div className="p-4 bg-white rounded-2xl shadow-inner inline-block mx-auto border-2 border-dashed border-blue-300">
              <QRCodeSVG
                value={student.nis}
                size={180}
                level="H"
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tunjukkan QR ID ini ke <strong>Ketua Kelas atau Admin</strong> jika mereka melakukan absensi langsung menggunakan Admin Scanner di kelas.
            </p>

            <button
              onClick={() => setShowIdCardModal(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Photo Modal */}
      {student && (
        <EditProfilePhotoModal
          student={student}
          isOpen={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
          onSavePhoto={updateStudentPhoto}
        />
      )}
    </div>
  );
};
