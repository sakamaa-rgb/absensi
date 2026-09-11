import React, { useState, useRef } from 'react';
import type { Student } from '../../types/database';
import { compressAndCropImage } from '../../lib/imageUtils';
import { 
  X, 
  Camera, 
  UploadCloud,
  Trash2, 
  Lock, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  FileImage,
  Sparkles
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
  const [selectedFileMeta, setSelectedFileMeta] = useState<{
    name: string;
    sizeKb: number;
    format: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const processFile = async (file: File) => {
    // Validate file type strictly for PNG, JPG, JPEG
    const validExtensions = ['image/jpeg', 'image/jpg', 'image/png'];
    const fileNameLower = file.name.toLowerCase();
    const isPngOrJpg = 
      validExtensions.includes(file.type) || 
      fileNameLower.endsWith('.png') || 
      fileNameLower.endsWith('.jpg') || 
      fileNameLower.endsWith('.jpeg');

    if (!isPngOrJpg) {
      setErrorMsg('Format file harus berupa PNG atau JPG (.png, .jpg, .jpeg).');
      return;
    }

    // Limit maximum raw file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Ukuran file foto maksimal 10 MB. Silakan pilih foto lain.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg('');

      const formatLabel = fileNameLower.endsWith('.png') 
        ? 'PNG' 
        : (fileNameLower.endsWith('.jpeg') || fileNameLower.endsWith('.jpg') ? 'JPG' : file.type.split('/')[1]?.toUpperCase() || 'IMG');

      setSelectedFileMeta({
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
        format: formatLabel
      });

      const compressedBase64 = await compressAndCropImage(file, 400, 0.85);
      setPreviewUrl(compressedBase64);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal membaca dan memproses file foto. Pastikan file gambar tidak rusak.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleRemovePhoto = () => {
    setPreviewUrl(null);
    setSelectedFileMeta(null);
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
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 font-heading">
                Upload Foto Profil Pribadi
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pilih file foto format PNG atau JPG langsung dari perangkat
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 scrollbar-transparent">
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

          {/* Hidden HTML File Input - Strictly accepts PNG and JPG */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Dedicated File Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-3xl p-5 sm:p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-blue-500 bg-blue-50/80 scale-[1.01] shadow-md ring-4 ring-blue-100'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30'
            }`}
          >
            <div className="flex flex-col items-center space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <UploadCloud className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {isDragging ? 'Lepaskan File Foto di Sini' : 'Klik atau Tarik File Foto ke Sini'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Pilih file langsung dari galeri HP atau folder laptop Anda. 
                  <span className="font-semibold text-blue-600"> Bukan tautan/URL</span>.
                </p>
              </div>

              {/* Supported Format Badges */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold border border-blue-200">
                  .PNG
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                  .JPG
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold border border-indigo-200">
                  .JPEG
                </span>
                <span className="text-[10px] text-slate-400 font-medium ml-1">
                  (Maks. 10 MB)
                </span>
              </div>
            </div>
          </div>

          {/* Photo Preview & Controls */}
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5">
            {/* Avatar Preview */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-3xl shadow-md border-2 border-white">
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
                title="Pilih file foto baru"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Photo details & file info */}
            <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
              <div className="flex items-center justify-center sm:justify-start space-x-1.5">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {previewUrl ? 'Foto Siap Disimpan' : 'Belum Ada Foto Profil'}
                </p>
                {previewUrl && (
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Siap
                  </span>
                )}
              </div>

              {selectedFileMeta ? (
                <div className="p-2 rounded-xl bg-white border border-slate-200 text-left text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                      {selectedFileMeta.name}
                    </span>
                    <span className="font-bold text-blue-600 px-1.5 py-0.5 rounded bg-blue-50 text-[10px]">
                      {selectedFileMeta.format}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Ukuran asal: {selectedFileMeta.sizeKb} KB • Otomatis dioptimalkan untuk presensi
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Gunakan foto wajah jelas dengan latar polos agar mudah diverifikasi guru & admin saat presensi.
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <FileImage className="w-3.5 h-3.5" />
                  <span>{previewUrl ? 'Ganti File PNG/JPG' : 'Pilih File PNG/JPG'}</span>
                </button>

                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isProcessing}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200 transition-all cursor-pointer"
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
                Siswa Hanya Mengubah Foto
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
                <strong>Ketentuan Sekolah:</strong> Siswa hanya diizinkan mengunggah foto profil pribadi (PNG/JPG). Nama, nomor absen, NISN, dan kelas dikunci demi validitas data presensi rapor.
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
              <span>Memproses File...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Foto Profil</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
