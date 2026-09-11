import React, { useState } from 'react';
import { dataStore } from '../../services/dataStore';
import type { SystemSettings } from '../../types/database';
import { 
  MapPin, 
  Clock, 
  Save, 
  School, 
  CheckCircle2
} from 'lucide-react';


export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(dataStore.getSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form State
  const [schoolName, setSchoolName] = useState(settings.school_name);
  const [className, setClassName] = useState(settings.class_name);
  const [latitude, setLatitude] = useState(settings.latitude);
  const [longitude, setLongitude] = useState(settings.longitude);
  const [radiusMeters, setRadiusMeters] = useState(settings.radius_meters);
  const [qrExpiry, setQrExpiry] = useState(settings.default_qr_expiry_seconds);
  const [lateThreshold, setLateThreshold] = useState(settings.late_threshold_time);
  const [faceVerification, setFaceVerification] = useState(settings.face_verification_default);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = dataStore.updateSettings({
      school_name: schoolName,
      class_name: className,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radius_meters: Number(radiusMeters),
      default_qr_expiry_seconds: Number(qrExpiry),
      late_threshold_time: lateThreshold,
      face_verification_default: faceVerification,
    });
    setSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleDetectCurrentCoords = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(7)));
          setLongitude(Number(pos.coords.longitude.toFixed(7)));
          alert(`Koordinat berhasil diperbarui ke lokasi Anda saat ini: ${pos.coords.latitude.toFixed(7)}, ${pos.coords.longitude.toFixed(7)}`);
        },
        () => alert('Gagal mendeteksi lokasi GPS browser.')
      );
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
          Pengaturan Sistem Absensi
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Konfigurasi titik lokasi GPS sekolah, radius toleransi, durasi QR, dan batas keterlambatan
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center space-x-2 text-emerald-700 text-xs font-semibold shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan sistem berhasil disimpan dan langsung diterapkan!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identitas Sekolah & Kelas */}
        <div className="glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm bg-white/95 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <School className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 font-heading">
              Identitas Sekolah & Kelas
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Nama Sekolah</label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full glass-input rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Nama Kelas</label>
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full glass-input rounded-xl p-2.5"
              />
            </div>
          </div>
        </div>

        {/* Koordinat GPS & Radius */}
        <div className="glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm bg-white/95 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 font-heading">
                Titik Koordinat GPS Sekolah & Radius
              </h3>
            </div>
            <button
              type="button"
              onClick={handleDetectCurrentCoords}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-700 font-bold border border-slate-200 transition-all cursor-pointer"
            >
              Gunakan Lokasi Saya Saat Ini
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Latitude Sekolah</label>
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(Number(e.target.value))}
                className="w-full glass-input rounded-xl p-2.5 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Longitude Sekolah</label>
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(Number(e.target.value))}
                className="w-full glass-input rounded-xl p-2.5 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Radius Absensi (Meter)</label>
              <input
                type="number"
                min="20"
                max="2000"
                required
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(Number(e.target.value))}
                className="w-full glass-input rounded-xl p-2.5 font-mono"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Siswa yang berada di luar radius meter ini saat melakukan scan Dynamic QR akan ditolak oleh sistem.
          </p>
        </div>

        {/* Aturan Waktu & Dynamic QR */}
        <div className="glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm bg-white/95 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900 font-heading">
              Aturan Waktu & Dynamic QR Token
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Masa Berlaku Dynamic QR (Detik)
              </label>
              <input
                type="number"
                min="15"
                max="120"
                required
                value={qrExpiry}
                onChange={(e) => setQrExpiry(Number(e.target.value))}
                className="w-full glass-input rounded-xl p-2.5 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Rekomendasi: 30 - 60 detik</span>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Batas Waktu Terlambat (WIB)
              </label>
              <input
                type="time"
                required
                value={lateThreshold}
                onChange={(e) => setLateThreshold(e.target.value)}
                className="w-full glass-input rounded-xl p-2.5 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Absen setelah jam ini tercatat TERLAMBAT</span>
            </div>
          </div>

          {/* Optional Face Verification Switch */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Face Verification (Biometrik Wajah)</span>
              <span className="text-[11px] text-slate-500">
                Fitur opsional face-api.js untuk verifikasi wajah saat scan
              </span>
            </div>

            <button
              type="button"
              onClick={() => setFaceVerification(!faceVerification)}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                faceVerification ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform absolute top-0.5 ${
                  faceVerification ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
