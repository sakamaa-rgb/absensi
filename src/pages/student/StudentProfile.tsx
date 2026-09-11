import React, { useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import { QRCodeSVG } from 'qrcode.react';
import { EditProfilePhotoModal } from '../../components/student/EditProfilePhotoModal';
import { 
  Smartphone, 
  ShieldCheck, 
  IdCard, 
  HelpCircle,
  LogOut,
  Camera,
  Lock,
  ShieldAlert
} from 'lucide-react';

export const StudentProfile: React.FC = () => {
  const { student, logout, updateStudentPhoto } = useAuth();
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  if (!student) return null;

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
          Profil Siswa & Status Perangkat
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Informasi akun kelas dan identifikasi keamanan HP kamu
        </p>
      </div>

      {/* Student Identity Card with Photo & Locked Status */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5 bg-white/95">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4 pb-5 border-b border-slate-100 text-center sm:text-left">
          {/* Student Photo Avatar with Interactive Camera Trigger */}
          <div 
            onClick={() => setShowPhotoModal(true)}
            className="relative group cursor-pointer shrink-0"
            title="Klik untuk ubah foto profil"
          >
            <div className="w-20 h-20 rounded-3xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl font-heading shadow-md shadow-blue-500/20 border-2 border-white group-hover:ring-4 group-hover:ring-blue-100 transition-all">
              {student.foto_url ? (
                <img src={student.foto_url} alt={student.nama} className="w-full h-full object-cover" />
              ) : (
                <span>{student.nama.charAt(0)}</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-blue-600 text-white shadow-md group-hover:scale-110 transition-transform">
              <Camera className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-center sm:justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-heading">{student.nama}</h2>
                <p className="text-xs text-blue-600 font-semibold">
                  Absen #{student.nomor_absen} • {student.kelas} SMKN 1 Ciomas
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPhotoModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-700 text-xs font-bold border border-blue-200 shadow-2xs transition-all cursor-pointer touch-manipulation"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Upload File Foto (PNG/JPG)</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mt-2">
              {student.foto_url 
                ? 'Foto profil pribadi aktif. Format file PNG/JPG tersimpan aman di profil presensi.'
                : 'Belum ada foto profil. Unggah file gambar PNG atau JPG langsung dari HP atau laptop kamu.'}
            </p>
          </div>
        </div>

        {/* Academic Identity Details (STRICTLY LOCKED) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 flex items-center">
              <Lock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              Data Akademik Sekolah (Terkunci)
            </span>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              Read-Only
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Nama Siswa</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">{student.nama}</span>
              </div>
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Nomor Absen</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">Absen #{student.nomor_absen}</span>
              </div>
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Nomor Induk Siswa (NIS)</span>
                <span className="font-mono text-xs font-bold text-slate-800 mt-0.5 block">{student.nis}</span>
              </div>
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">NISN (Password Akun)</span>
                <span className="font-mono text-xs font-bold text-slate-800 mt-0.5 block">{student.nisn}</span>
              </div>
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 sm:col-span-2 flex items-start justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Kelas & Jurusan</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">{student.kelas} SMKN 1 Ciomas</span>
              </div>
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-100/70 border border-slate-200 text-slate-600 text-[11px] flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Data nama, nomor absen, NISN, dan kelas dikunci secara permanen oleh sekolah dan hanya dapat diubah oleh Admin / Wali Kelas. Anda hanya dapat mengubah foto profil pribadi.
            </p>
          </div>
        </div>
      </div>

      {/* Device Binding Status Card */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4 bg-white/95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 font-heading">Status Device HP Terdaftar</h3>
          </div>
          {student.device_token ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Device Terikat
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Belum Diikat (Auto-Bind Saat Scan)
            </span>
          )}
        </div>

        {student.device_token ? (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Device Token Hash</span>
              <p className="font-mono text-xs font-bold text-indigo-700 break-all">
                {student.device_token}
              </p>
            </div>

            {student.device_info && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Platform & Layar</span>
                <p className="text-slate-700 font-medium">
                  {student.device_info.platform} • {student.device_info.screenResolution}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 leading-relaxed">
            Perangkat HP kamu akan otomatis terdaftar dan diikat saat pertama kali kamu berhasil melakukan scan absensi.
          </p>
        )}

        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start space-x-2.5">
          <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
          <p className="leading-relaxed">
            Untuk mencegah titip absen, akun ini hanya dapat digunakan pada satu HP. 
            Jika berganti HP, minta <strong>Ketua Kelas / Admin</strong> untuk mereset device kamu.
          </p>
        </div>
      </div>

      {/* Digital QR Card for Admin Scan */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm text-center space-y-4 bg-white/95">
        <div className="flex items-center justify-center space-x-2">
          <IdCard className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 font-heading">QR Identitas Digital Siswa</h3>
        </div>

        <div className="p-4 bg-white rounded-2xl shadow-inner inline-block mx-auto border-2 border-dashed border-blue-300">
          <QRCodeSVG
            value={student.nis}
            size={160}
            level="H"
          />
        </div>

        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          Tunjukkan kode QR ini jika Ketua Kelas atau Admin melakukan absensi langsung menggunakan Admin Scanner di ruang kelas.
        </p>
      </div>

      {/* Logout button */}
      <button
        onClick={() => { void logout(); }}
        className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span>Keluar dari Akun Siswa</span>
      </button>

      {/* Edit Profile Photo Modal */}
      <EditProfilePhotoModal
        student={student}
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onSavePhoto={updateStudentPhoto}
      />
    </div>
  );
};
