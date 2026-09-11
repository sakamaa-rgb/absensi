import React, { useState, useRef, useEffect } from 'react';
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
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface EditProfilePhotoModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSavePhoto: (photoUrl: string | null) => boolean | Promise<boolean>;
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

  // Automatically sync previewUrl whenever modal opens or student changes
  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(student.foto_url || null);
      setSelectedFileMeta(null);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, student.foto_url]);

  if (!isOpen) return null;

  const currentPhoto = student.foto_url || null;
  const hasChanges = previewUrl !== currentPhoto;

  const processFile = async (file: File) => {
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

      // Compress to crisp, lightweight square avatar
      const compressedBase64 = await compressAndCropImage(file, 320, 0.82);
      setPreviewUrl(compressedBase64);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memproses file gambar. Pastikan file foto tidak rusak.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    // Reset file input value so re-selecting same file still triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    setErrorMsg('');
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    try {
      setIsProcessing(true);
      setErrorMsg('');
      const ok = await onSavePhoto(previewUrl);
      if (ok) {
        setSuccessMsg('Foto profil pribadi berhasil disimpan!');
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 1000);
      } else {
        setErrorMsg('Gagal menyimpan foto ke sistem. Silakan coba lagi.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kendala saat menyimpan foto profil.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 font-heading">
                Upload Foto Profil Siswa
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pilih file foto PNG atau JPG langsung dari galeri HP / laptop
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 scrollbar-transparent">
          {/* Notification Alerts */}
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

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* 1. Main Photo Avatar & Status Section */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
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
                disabled={isProcessing}
                className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
                title="Pilih file foto"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Info & Quick Actions */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-800">
                  {previewUrl 
                    ? (hasChanges ? 'Foto Baru Terpilih' : 'Foto Profil Aktif')
                    : 'Belum Ada Foto Profil'}
                </span>

                {previewUrl && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    hasChanges 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {hasChanges ? 'Siap Disimpan' : 'Terverifikasi'}
                  </span>
                )}
              </div>

              {selectedFileMeta ? (
                <div className="p-2 rounded-xl bg-white border border-slate-200 text-left text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 truncate max-w-[180px]">
                      {selectedFileMeta.name}
                    </span>
                    <span className="font-bold text-blue-600 px-1.5 py-0.5 rounded bg-blue-50 text-[10px]">
                      {selectedFileMeta.format}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {selectedFileMeta.sizeKb} KB • Dikompres optimal untuk presensi
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Gunakan foto formal/jelas menghadap depan agar mudah diverifikasi guru & admin saat presensi.
                </p>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <FileImage className="w-3.5 h-3.5" />
                  <span>{previewUrl ? 'Ganti Foto' : 'Pilih File PNG/JPG'}</span>
                </button>

                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isProcessing}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. File Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-blue-500 bg-blue-50/80 scale-[1.01] shadow-md ring-4 ring-blue-100'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30'
            }`}
          >
            <div className="flex flex-col items-center space-y-2">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <UploadCloud className="w-5 h-5" />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-800">
                  {isDragging ? 'Lepaskan File Foto di Sini' : 'Tarik atau Klik untuk Upload File Foto'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Format file: <span className="font-semibold text-slate-700">.PNG, .JPG, .JPEG</span> (Maksimal 10 MB)
                </p>
              </div>
            </div>
          </div>

          {/* 3. Academic Identity Information (STRICTLY LOCKED) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900 font-heading flex items-center">
                <Lock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                Data Akademik Terverifikasi (Terkunci)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                Siswa Hanya Ubah Foto
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-600">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Nama Siswa</span>
                <span className="text-xs font-bold text-slate-800 block truncate mt-0.5">{student.nama}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-600">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Nomor Absen</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">#{student.nomor_absen}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-600">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">NISN</span>
                <span className="font-mono text-xs font-bold text-slate-800 block mt-0.5">{student.nisn}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-600">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Kelas</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">{student.kelas}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start space-x-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-snug text-[10px]">
                Nama, nomor absen, dan NISN siswa dikunci oleh sistem sekolah demi integritas data absensi rapor.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {hasChanges ? (
              <span className="text-blue-600 font-semibold flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Ada perubahan foto yang belum disimpan
              </span>
            ) : (
              <span>Pilih file foto baru untuk menyimpan</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isProcessing}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
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
    </div>
  );
};
