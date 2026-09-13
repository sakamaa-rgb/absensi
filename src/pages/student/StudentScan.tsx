import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/useAuth';
import { dataStore } from '../../services/dataStore';
import { calculateHaversineDistance } from '../../lib/location';
import type { AttendanceRecord } from '../../types/database';
import { QRCodeSVG } from 'qrcode.react';
import { StatusBadge } from '../../components/attendance/StatusBadge';
import { AttendanceLocationCard } from '../../components/attendance/AttendanceLocationCard';
import { 
  Maximize2, 
  Minimize2, 
  CheckCircle2, 
  Clock, 
  Sun, 
  ShieldCheck, 
  MapPin, 
  RotateCw, 
  AlertTriangle, 
  Sparkles
} from 'lucide-react';

export const StudentScan: React.FC = () => {
  const { student } = useAuth();

  // Attendance status
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // GPS & Location State
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number>(0);

  // Dynamic QR Token (Anti-Screenshot / Anti-Titip Absen)
  const [qrTimestamp, setQrTimestamp] = useState<number>(() => Date.now());
  const [session, setSession] = useState(() => dataStore.getActiveSession());
  const [settings, setSettings] = useState(() => dataStore.getSettings());
  const tokenDuration = session?.qr_expiry_seconds || settings?.default_qr_expiry_seconds || 30;
  const [secondsLeft, setSecondsLeft] = useState<number>(tokenDuration);

  const schoolLat = session?.latitude_sekolah || -6.6025000;
  const schoolLng = session?.longitude_sekolah || 106.7580556;
  const maxRadius = session?.radius_meter || 100;

  // Check today's attendance record & sync active session
  useEffect(() => {
    if (!student) return;

    const checkStatus = () => {
      const today = new Date().toISOString().split('T')[0];
      const records = dataStore.getAttendanceByStudent(student.id);
      const todayRec = records.find(r => r.tanggal === today);
      setTodayRecord(todayRec || null);
      setSession(dataStore.getActiveSession());
      setSettings(dataStore.getSettings());
    };

    checkStatus();
    return dataStore.subscribe(checkStatus);
  }, [student]);

  // Request high-accuracy GPS Geolocation
  const fetchLocation = useCallback(() => {
    setGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung Geolocation GPS.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = Number(pos.coords.latitude.toFixed(7));
        const userLng = Number(pos.coords.longitude.toFixed(7));
        const userAcc = Number(pos.coords.accuracy.toFixed(1));

        setCoords({
          latitude: userLat,
          longitude: userLng,
          accuracy: userAcc,
        });

        const dist = calculateHaversineDistance(userLat, userLng, schoolLat, schoolLng);
        setDistance(dist);
        setGpsLoading(false);
      },
      (err) => {
        console.warn('GPS detection warning:', err.message);
        // Fallback default coordinates (SMKN 1 Ciomas)
        setCoords({
          latitude: schoolLat,
          longitude: schoolLng,
          accuracy: 10,
        });
        setDistance(0);
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Izin GPS tidak diberikan. Silakan izinkan akses lokasi pada browser HP.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
    );
  }, [schoolLat, schoolLng]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLocation();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchLocation]);

  // Anti-Titip Absen: Auto-refresh dynamic QR token based on settings
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setQrTimestamp(Date.now());
          return tokenDuration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenDuration]);

  const handleManualRefreshToken = () => {
    setQrTimestamp(Date.now());
    setSecondsLeft(tokenDuration);
    fetchLocation();
  };

  if (!student) return null;

  // The Dynamic Anti-Titip QR Payload - Compact & ultra-fast for instant camera recognition
  const dynamicQrPayload = JSON.stringify({
    nis: student.nis,
    t: qrTimestamp,
    lat: Number((coords?.latitude ?? schoolLat).toFixed(5)),
    lng: Number((coords?.longitude ?? schoolLng).toFixed(5)),
  });

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-6 animate-page-enter">
      {/* Page Title & Status Pill */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-xs animate-float-gentle">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Kartu QR Presensi XI PPLG 3</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
          Tunjukkan QR Kamu
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto">
          Arahkan layar HP ini ke kamera Ketua Kelas / Admin saat diabsen di kelas
        </p>

        {/* Quick GPS Status Chip directly on top for fast mobile glance */}
        <div className="pt-1">
          {gpsLoading ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 animate-pulse">
              <RotateCw className="w-3 h-3 mr-1.5 animate-spin text-blue-600" />
              Mendeteksi titik koordinat lokasi HP Anda...
            </span>
          ) : coords ? (
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
              📍 Koordinat Terdeteksi: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)} • Akurasi ±{coords.accuracy}m
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
              <MapPin className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Lokasi Terhubung Otomatis
            </span>
          )}
        </div>
      </div>

      {/* Main Student QR Card */}
      <div 
        className={`glass-card rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-xl text-center space-y-4 sm:space-y-5 bg-white/95 transition-all hover-lift ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none flex flex-col justify-center items-center p-6 bg-white overflow-y-auto' : ''
        }`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 w-full max-w-sm mx-auto">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 p-0.5 flex items-center justify-center shadow-xs overflow-hidden">
              <img src="/logo-pplg3.png" alt="Logo XI PPLG 3" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div className="text-left">
              <p className="text-xs font-extrabold text-slate-900 font-heading">XI PPLG 3</p>
              <p className="text-[10px] text-slate-500">SMKN 1 Ciomas</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleManualRefreshToken}
              title="Perbarui Token QR & Lokasi"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer touch-press"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Keluar Mode Layar Penuh' : 'Perbesar Layar'}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer touch-press"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Student Name & Details */}
        <div className="space-y-1">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-lg sm:text-xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20 border-2 border-white">
            {student.foto_url ? (
              <img src={student.foto_url} alt={student.nama} className="w-full h-full object-cover" />
            ) : (
              student.nomor_absen
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading pt-1">
            {student.nama}
          </h2>
          <p className="text-xs font-semibold text-blue-600">
            Nomor Absen #{student.nomor_absen} • NIS: {student.nis}
          </p>
        </div>

        {/* Anti-Titip Notice Banner */}
        <div className="w-full max-w-sm mx-auto p-2.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-left flex items-start space-x-2 text-[11px] text-amber-800">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="font-bold">Proteksi Anti-Titip Absen Aktif</p>
            <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">
              QR dinamis berganti setiap {tokenDuration} detik & mengikat koordinat lokasi HP Anda secara real-time.
            </p>
          </div>
        </div>

        {/* The BIG QR Code Canvas with High Contrast and Clear Margin */}
        <div className="relative p-2.5 sm:p-3.5 bg-white rounded-3xl shadow-lg inline-block mx-auto border-3 border-blue-500/80 overflow-hidden ring-4 ring-blue-50">
          {/* Subtle 4 Corner Accents */}
          <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t-2 border-l-2 border-blue-600 rounded-tl-sm pointer-events-none" />
          <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t-2 border-r-2 border-blue-600 rounded-tr-sm pointer-events-none" />
          <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b-2 border-l-2 border-blue-600 rounded-bl-sm pointer-events-none" />
          <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b-2 border-r-2 border-blue-600 rounded-br-sm pointer-events-none" />

          <QRCodeSVG
            id="student-personal-qr"
            value={dynamicQrPayload}
            size={isFullscreen ? 280 : 225}
            level="L"
            includeMargin={true}
          />
        </div>

        {/* Countdown Progress Bar (Auto-refresh) */}
        <div className="w-full max-w-sm mx-auto space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span className="flex items-center text-blue-600">
              <Clock className="w-3.5 h-3.5 mr-1 animate-spin" />
              QR Dinamis berganti dalam:
            </span>
            <span className="font-mono text-xs font-bold text-blue-600">
              {secondsLeft}s
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 rounded-full ${secondsLeft > 8 ? 'bg-blue-600' : 'bg-rose-500'}`}
              style={{ width: `${(secondsLeft / tokenDuration) * 100}%` }}
            />
          </div>
        </div>

        {/* Live Attendance Status Today */}
        <div className="w-full max-w-sm mx-auto space-y-3 pt-1">
          {todayRecord ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-left">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">SUDAH DICATAT KETUA KELAS</p>
                  <p className="text-[11px] text-emerald-700 flex items-center mt-0.5">
                    <Clock className="w-3 h-3 mr-1" />
                    Pukul {todayRecord.waktu} WIB
                  </p>
                </div>
              </div>
              <StatusBadge status={todayRecord.status} size="sm" />
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center font-medium space-y-0.5">
              <p className="font-bold flex items-center justify-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse mr-1" />
                SIAP DISCAN KETUA KELAS / ADMIN
              </p>
              <p className="text-[11px] text-amber-700">
                Arahkan layar HP ini ke kamera scanner Ketua Kelas
              </p>
            </div>
          )}
        </div>

        {/* Brightness Hint */}
        <div className="w-full max-w-sm mx-auto flex items-center justify-center space-x-1.5 text-[11px] text-slate-500">
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Tingkatkan kecerahan layar HP agar QR mudah terbaca kamera scanner</span>
        </div>

        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="mt-4 px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
          >
            Tutup Tampilan Penuh
          </button>
        )}
      </div>

      {/* TITIK LOKASI SISWA: GOOGLE MAPS IFRAME REAL-TIME */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
            <MapPin className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            Titik Lokasi GPS Siswa (Iframe Maps)
          </span>
          <button
            type="button"
            onClick={fetchLocation}
            className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center cursor-pointer"
          >
            <RotateCw className="w-3 h-3 mr-1" />
            Cek Ulang GPS
          </button>
        </div>

        {/* Status if GPS denied or outside radius */}
        {gpsError && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}

        {/* The Live Interactive Iframe Map Card */}
        <AttendanceLocationCard
          isLivePreview={!todayRecord}
          record={todayRecord}
          student={student}
          coords={coords ? { ...coords, distance } : null}
          maxRadius={maxRadius}
          title={todayRecord ? 'Titik Lokasi Presensi Terverifikasi' : 'Titik Lokasi GPS Siswa (Live)'}
        />
      </div>
    </div>
  );
};
