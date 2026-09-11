import React, { useState, useRef } from 'react';
import type { Student } from '../../types/database';
import { compressAndCropImage } from '../../lib/imageUtils';
import { 
  X, 
  Camera, 
  Upload, 
  Trash2, 
  Lock, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface EditProfilePhotoModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSavePhoto: (photoUrl: string | null) => boolean;
}

export const EditProfilePhotoModal: React.FC<EditProfilePhotoModalProps> = ({
  student,
  isOpen,
  onClose,
  onSavePhoto,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(student.foto_url || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Harap pilih file gambar (JPG, PNG, WEBP).');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg('');
      const compressedBase64 = await compressAndCropImage(file, 400, 0.85);
      setPreviewUrl(compressedBase64);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memproses gambar. Silakan coba gambar lain.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemovePhoto = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    try {
      setIsProcessing(true);
      const ok = onSavePhoto(previewUrl);
      if (ok) {
        setSuccessMsg('Foto profil pribadi berhasil disimpan!');
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 1200);
      } else {
        setErrorMsg('Gagal menyimpan foto. Silakan coba lagi.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat menyimpan foto profil.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 font-heading">
                Ubah Foto Profil Pribadi
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Sesuaikan foto identitas presensi kamu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 scrollbar-transparent">
          {/* Notification alerts */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Photo Preview & Controls */}
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5 p-4 rounded-3xl bg-slate-50 border border-slate-200/80">
            {/* Avatar Circle / Rounded Square */}
            <div className="relative group">
              <div className="w-28 h-28 rounded-3xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-3xl shadow-lg border-2 border-white">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={student.nama}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{student.nama.charAt(0)}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
                title="Pilih foto"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Action Buttons */}
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <p className="text-xs font-bold text-slate-800">
                {previewUrl ? 'Foto Siap Digunakan' : 'Belum Ada Foto Pribadi'}
              </p>
              <p className="text-[11px] text-slate-500">
                Gunakan foto formal atau wajah jelas agar mudah diverifikasi oleh Ketua Kelas / Admin saat absensi.
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{previewUrl ? 'Ganti Foto' : 'Unggah Foto'}</span>
                </button>

                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isProcessing}
                    className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Academic Identity Information (STRICTLY LOCKED / READ ONLY) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 font-heading flex items-center">
                <Lock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                Data Akademik Terverifikasi (Terkunci)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                Khusus Admin / Wali Kelas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Nama Lengkap */}
              <div className="p-3 rounded-2xl bg-slate-100/80 border border-slate-200 text-slate-600">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Nama Lengkap</span>
                <span className="text-xs font-bold text-slate-800 block truncate mt-0.5">{student.nama}</span>
              </div>

              {/* Nomor Absen */}
              <div className="p-3 rounded-2xl bg-slate-100/80 border border-slate-200 text-slate-600">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Nomor Absen</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">#{student.nomor_absen}</span>
              </div>

              {/* NISN */}
              <div className="p-3 rounded-2xl bg-slate-100/80 border border-slate-200 text-slate-600">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">NISN / NIS</span>
                <span className="font-mono text-xs font-bold text-slate-800 block mt-0.5">{student.nisn} / {student.nis}</span>
              </div>

              {/* Kelas */}
              <div className="p-3 rounded-2xl bg-slate-100/80 border border-slate-200 text-slate-600">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Kelas & Jurusan</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">{student.kelas} SMKN 1 Ciomas</span>
              </div>
            </div>

            {/* Protection Notice Banner */}
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Catatan Keamanan:</strong> Nama, NISN, nomor absen, dan kelas siswa dikunci oleh sistem sekolah dan tidak dapat diubah oleh siswa demi menjaga integritas data absensi rapor.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
          >
            {isProcessing ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
