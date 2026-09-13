import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { dataStore } from '../../services/dataStore';
import type { Student, AttendanceStatus, AttendanceRecord } from '../../types/database';
import { StatusBadge } from '../../components/attendance/StatusBadge';
import { AttendanceLocationCard } from '../../components/attendance/AttendanceLocationCard';
import { 
  ScanLine, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Volume2, 
  Users,
  MapPin,
  FlipHorizontal2,
  RefreshCw,
  Upload,
  ExternalLink,
  RotateCcw
} from 'lucide-react';

export const AdminScanStudent: React.FC = () => {
  const [scannerActive, setScannerActive] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('HADIR');
  const [isMirrored, setIsMirrored] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [scannerError, setScannerError] = useState<{
    title: string;
    message: string;
    isHttpsRequired?: boolean;
  } | null>(null);
  const [isFileScanning, setIsFileScanning] = useState(false);

  // Helper to load recent scans directly from persistent dataStore so reload never loses the list
  const getTodayScans = (): Array<{
    student: Student;
    status: AttendanceStatus;
    time: string;
    record?: AttendanceRecord;
  }> => {
    const today = new Date().toISOString().split('T')[0];
    const allAtt = dataStore.getAttendance()
      .filter(a => a.tanggal === today)
      .sort((a, b) => {
        const tA = a.created_at || a.waktu || '';
        const tB = b.created_at || b.waktu || '';
        return tB.localeCompare(tA);
      });

    const results: Array<{
      student: Student;
      status: AttendanceStatus;
      time: string;
      record?: AttendanceRecord;
    }> = [];

    for (const att of allAtt.slice(0, 20)) {
      const std = att.student || dataStore.getStudentById(att.student_id);
      if (std) {
        results.push({
          student: std,
          status: att.status,
          time: att.waktu ? att.waktu.substring(0, 5) : 'Hari Ini',
          record: att,
        });
      }
    }
    return results;
  };

  const getInitialLastScannedResult = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = dataStore.getAttendance()
      .filter(a => a.tanggal === today)
      .sort((a, b) => {
        const tA = a.created_at || a.waktu || '';
        const tB = b.created_at || b.waktu || '';
        return tB.localeCompare(tA);
      });

    if (todayAttendance.length > 0) {
      const latest = todayAttendance[0];
      const student = latest.student || dataStore.getStudentById(latest.student_id);
      if (student) {
        return {
          success: true,
          message: `Presensi Terakhir Tersimpan: ${student.nama} (#${student.nomor_absen}) tercatat ${latest.status} pukul ${latest.waktu || '-'} WIB`,
          student,
          record: latest,
        };
      }
    }
    return null;
  };

  const [lastScannedResult, setLastScannedResult] = useState<{
    success: boolean;
    message: string;
    student?: Student;
    record?: AttendanceRecord;
    isSuspicious?: boolean;
  } | null>(() => getInitialLastScannedResult());

  const [selectedLocationRecord, setSelectedLocationRecord] = useState<{
    record: AttendanceRecord;
    student: Student;
  } | null>(null);

  const [liveCoords, setLiveCoords] = useState<{ latitude: number; longitude: number } | null>(() => {
    const settings = dataStore.getSettings();
    return {
      latitude: settings.latitude || -6.6025000,
      longitude: settings.longitude || 106.7580556,
    };
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>(() => dataStore.getStudents());
  const [recentScans, setRecentScans] = useState<Array<{ 
    student: Student; 
    status: AttendanceStatus; 
    time: string;
    record?: AttendanceRecord;
  }>>(() => getTodayScans());
  const [attendanceCount, setAttendanceCount] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return dataStore.getAttendance().filter(a => a.tanggal === today).length;
  });
  const [isSuccessFlash, setIsSuccessFlash] = useState(false);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const fileScannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerId = 'admin-qr-reader';
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimestampRef = useRef<number>(0);

  // Sync attendance count, students, and recent scans on external dataStore changes or reload
  useEffect(() => {
    const refreshData = () => {
      const today = new Date().toISOString().split('T')[0];
      setStudents(dataStore.getStudents());
      setAttendanceCount(dataStore.getAttendance().filter(a => a.tanggal === today).length);
      setRecentScans(getTodayScans());
    };
    return dataStore.subscribe(refreshData);
  }, []);

  // Detect live GPS location or keep default to SMKN 1 Ciomas
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLiveCoords({
            latitude: Number(pos.coords.latitude.toFixed(7)),
            longitude: Number(pos.coords.longitude.toFixed(7)),
          });
        },
        () => {
          // Keep initial fallback coords
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  const playSuccessBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {
      // AudioContext unavailable
    }
  };

  const stopScanner = async () => {
    try {
      if (qrScannerRef.current && qrScannerRef.current.isScanning) {
        await qrScannerRef.current.stop();
        qrScannerRef.current.clear();
      }
    } catch {
      // Ignore
    }
    setScannerActive(false);
  };

  useEffect(() => {
    return () => {
      void stopScanner();
      if (fileScannerRef.current) {
        try {
          fileScannerRef.current.clear();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const startScanner = async (facing: 'environment' | 'user' = cameraFacing) => {
    setLastScannedResult(null);
    setScannerError(null);
    setScannerActive(true);

    try {
      if (!qrScannerRef.current) {
        qrScannerRef.current = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
      }

      await qrScannerRef.current.start(
        { facingMode: facing },
        {
          fps: 20,
          aspectRatio: 1.0,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrEdge = Math.max(Math.floor(minEdge * 0.85), 240);
            return { width: qrEdge, height: qrEdge };
          },
        },
        async (decodedText) => {
          handleStudentScanned(decodedText);
        },
        () => {}
      );
    } catch (err: unknown) {
      console.error('Admin scanner start error:', err);
      setScannerActive(false);
      const isHttp = typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      setScannerError({
        title: 'Kamera Tidak Dapat Dibuka',
        message: isHttp
          ? 'Browser HP (Safari / Chrome) memblokir video kamera langsung jika diakses via HTTP biasa tanpa SSL.'
          : 'Izin kamera belum aktif atau sedang digunakan aplikasi lain. Pastikan izin kamera telah diberikan di browser.',
        isHttpsRequired: isHttp,
      });
    }
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileScanning(true);
    setScannerError(null);
    setLastScannedResult(null);

    try {
      if (!fileScannerRef.current) {
        fileScannerRef.current = new Html5Qrcode('admin-qr-file-dummy', {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
      }
      const decoded = await fileScannerRef.current.scanFile(file, false);
      if (decoded) {
        handleStudentScanned(decoded);
      }
    } catch (err) {
      console.warn('QR file scan failed:', err);
      setLastScannedResult({
        success: false,
        message: 'QR Code tidak terdeteksi pada foto/gambar. Pastikan kartu QR berada di tengah dan pencahayaan terang.',
      });
    } finally {
      setIsFileScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleFacingMode = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (scannerActive) {
      await stopScanner();
      setTimeout(() => {
        void startScanner(nextFacing);
      }, 250);
    }
  };

  const handleStudentScanned = (scannedValue: string) => {
    const clean = scannedValue.trim();
    const now = Date.now();

    // Prevent duplicate triggers within 2 seconds for the exact same student
    if (clean === lastScannedCodeRef.current && now - lastScanTimestampRef.current < 2500) {
      return;
    }

    lastScannedCodeRef.current = clean;
    lastScanTimestampRef.current = now;

    const result = dataStore.adminScanStudent(clean, selectedStatus, liveCoords || undefined);
    setLastScannedResult(result);

    if (result.success && result.student) {
      playSuccessBeep();
      setIsSuccessFlash(true);
      setTimeout(() => setIsSuccessFlash(false), 900);

      try {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      const newScanItem = {
        student: result.student,
        status: result.record?.status || selectedStatus,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        record: result.record,
      };

      setRecentScans(prev => [newScanItem, ...prev.filter(p => p.student.id !== result.student!.id).slice(0, 19)]);
    }
  };

  const handleManualMark = (student: Student) => {
    const result = dataStore.adminScanStudent(student.id, selectedStatus, liveCoords || undefined);
    setLastScannedResult(result);
    if (result.success) {
      playSuccessBeep();
      setIsSuccessFlash(true);
      setTimeout(() => setIsSuccessFlash(false), 900);
      const newScanItem = {
        student,
        status: result.record?.status || selectedStatus,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        record: result.record,
      };
      setRecentScans(prev => [newScanItem, ...prev.filter(p => p.student.id !== student.id).slice(0, 19)]);
    }
  };

  const filteredStudents = searchQuery.trim()
    ? students.filter(s => 
        s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis.includes(searchQuery) ||
        String(s.nomor_absen).includes(searchQuery)
      )
    : [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold mb-2 shadow-xs">
            <ScanLine className="w-3.5 h-3.5 text-purple-600" />
            <span>Mode Khusus Ketua Kelas / Admin</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
            Scan QR Siswa di Kelas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Arahkan kamera ke layar HP atau kartu QR siswa untuk mencatat kehadiran langsung
          </p>
        </div>

        {/* Live Attendance Counter Pill */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3 self-start sm:self-auto">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Hadir Hari Ini</span>
            <p className="text-lg font-mono font-extrabold text-emerald-600">
              {attendanceCount} <span className="text-xs text-slate-500 font-normal">/ {students.length} Siswa</span>
            </p>
          </div>
        </div>
      </div>

      {/* Mobile HTTP to HTTPS Notice Banner */}
      {typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-base shrink-0">📱</span>
            <p>
              <strong className="font-bold">Akses dari HP (Safari/Chrome):</strong> Live camera browser memerlukan koneksi HTTPS. Klik tombol untuk pindah ke HTTPS atau gunakan tombol <strong>Foto QR</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = window.location.href.replace(/^http:/, 'https:');
            }}
            className="self-end sm:self-auto shrink-0 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka via HTTPS</span>
          </button>
        </div>
      )}

      {/* Status Selection Pill Bar */}
      <div className="glass-card rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-2.5 bg-white/95">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Status Kehadiran saat Di-scan:
          </span>
          <span className="text-[11px] text-slate-500 flex items-center">
            <Volume2 className="w-3.5 h-3.5 mr-1 text-blue-600" />
            Audio Beep Aktif
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(['HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPHA'] as AttendanceStatus[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === st
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-2 ring-blue-400/40'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Viewfinder */}
        <div className="glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4 flex flex-col items-center bg-white/95">
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
              <Camera className="w-4 h-4 mr-1.5 text-blue-600" />
              Kamera Scanner Kelas
            </span>

            <div className="flex items-center space-x-1.5">
              {/* Tombol Flip / Unmirror */}
              <button
                type="button"
                onClick={() => setIsMirrored(!isMirrored)}
                className={`text-xs px-2.5 py-1 rounded-xl font-bold flex items-center space-x-1.5 border transition-all cursor-pointer ${
                  isMirrored
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 shadow-xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 shadow-xs'
                }`}
                title={isMirrored ? 'Mode saat ini: Mirrored (Klik untuk ubah ke Normal)' : 'Mode saat ini: Normal (Tidak Mirror)'}
              >
                <FlipHorizontal2 className="w-3.5 h-3.5" />
                <span>{isMirrored ? 'Mirror: Aktif' : 'Tidak Mirror (Normal)'}</span>
              </button>

              {/* Tombol Ganti Kamera Depan / Belakang */}
              <button
                type="button"
                onClick={toggleFacingMode}
                className="text-xs px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 transition-colors cursor-pointer flex items-center space-x-1"
                title="Ganti Kamera Depan / Belakang"
              >
                <RefreshCw className="w-3 h-3 text-slate-600" />
                <span>{cameraFacing === 'environment' ? 'Belakang' : 'Depan'}</span>
              </button>

              {scannerActive && (
                <button
                  type="button"
                  onClick={() => { void stopScanner(); }}
                  className="text-xs px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition-colors cursor-pointer"
                >
                  Hentikan
                </button>
              )}
            </div>
          </div>

          <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-300 flex items-center justify-center shadow-inner">
            <div id={scannerContainerId} className={`w-full h-full ${isMirrored ? 'is-mirrored' : 'no-mirror'}`} />

            {/* Futuristic Animated Scanner Overlay when active */}
            {scannerActive && (
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center p-4">
                {/* Target Viewfinder Frame */}
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 max-w-[82%] max-h-[82%]">
                  {/* 4 Animated Glowing Cyan Corners */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg shadow-[0_0_12px_#22d3ee] animate-corner-breathe" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg shadow-[0_0_12px_#22d3ee] animate-corner-breathe" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg shadow-[0_0_12px_#22d3ee] animate-corner-breathe" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-lg shadow-[0_0_12px_#22d3ee] animate-corner-breathe" />

                  {/* Crosshair Center Reticle */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-40">
                    <div className="w-6 h-0.5 bg-cyan-400" />
                    <div className="h-6 w-0.5 bg-cyan-400 absolute" />
                  </div>

                  {/* Laser Beam moving up and down with glowing tail */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#38bdf8] animate-laser">
                    <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-cyan-400/25 to-transparent pointer-events-none" />
                  </div>
                </div>

                {/* Top Badge: Scanning Status & Interactive Mirror Toggle */}
                <div className="absolute top-3 inset-x-0 flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
                  <div className="px-3 py-1 rounded-full bg-slate-950/75 backdrop-blur-md border border-cyan-400/40 text-cyan-300 text-[11px] font-bold tracking-wider flex items-center space-x-2 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>MEMINDAI QR SISWA...</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMirrored(!isMirrored)}
                    className="px-2.5 py-1 rounded-full bg-slate-950/80 hover:bg-slate-900 backdrop-blur-md border border-cyan-400/40 text-cyan-300 text-[10px] font-bold tracking-wider flex items-center space-x-1 shadow-lg cursor-pointer transition-all hover:scale-105 active:scale-95"
                    title="Klik untuk membalik/unmirror kamera"
                  >
                    <FlipHorizontal2 className="w-3 h-3 text-cyan-400" />
                    <span>{isMirrored ? 'MIRROR' : 'TIDAK MIRROR'}</span>
                  </button>
                </div>

                {/* Bottom Helper */}
                <div className="absolute bottom-3 inset-x-0 flex justify-center">
                  <div className="px-3 py-1 rounded-full bg-slate-950/70 backdrop-blur-md text-white/90 text-[11px] font-medium border border-white/10">
                    Posisikan QR code di dalam bingkai
                  </div>
                </div>

                {/* Success Flash Effect */}
                {isSuccessFlash && (
                  <div className="absolute inset-0 z-30 bg-emerald-500/30 backdrop-blur-[2px] border-4 border-emerald-400 flex flex-col items-center justify-center animate-success-flash text-white">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/50 mb-2">
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                    <span className="font-extrabold text-sm tracking-wider uppercase text-white drop-shadow-md">
                      BERHASIL DI-SCAN!
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Hidden Input for direct photo capture from native mobile camera or file upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileScan}
            />
            <div id="admin-qr-file-dummy" className="hidden" />

            {/* File Scanning Loader */}
            {isFileScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-white/98 z-30">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm animate-pulse">
                  <RefreshCw className="w-7 h-7 animate-spin" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">
                  Memindai Foto QR Siswa...
                </h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  Sedang mengekstrak kode QR dari foto kartu siswa.
                </p>
              </div>
            )}

            {!scannerActive && !isFileScanning && (
              <>
                {scannerError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center space-y-3 bg-white/98 z-20 overflow-y-auto">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs shrink-0">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-rose-900 font-heading">
                        {scannerError.title}
                      </h3>
                      <p className="text-[11px] text-slate-600 mt-1 max-w-xs leading-relaxed">
                        {scannerError.message}
                      </p>
                    </div>

                    <div className="flex flex-col w-full max-w-xs space-y-2 pt-1">
                      {scannerError.isHttpsRequired && (
                        <button
                          type="button"
                          onClick={() => {
                            const httpsUrl = window.location.href.replace(/^http:/, 'https:');
                            window.location.href = httpsUrl;
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka via HTTPS Aman</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Ambil Foto QR (Kamera HP Langsung)</span>
                      </button>

                      <div className="flex items-center space-x-2 w-full pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setScannerError(null);
                            void startScanner();
                          }}
                          className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Coba Lagi</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setScannerError(null)}
                          className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Tutup
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-white/95">
                    <div className="w-16 h-16 rounded-3xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shadow-xs">
                      <ScanLine className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-heading">
                        Kamera Siap Scan Siswa
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                        Buka live camera untuk scan terus-menerus, atau ambil foto kartu QR siswa langsung dari kamera HP.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
                      <button
                        type="button"
                        onClick={() => { void startScanner(); }}
                        className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer touch-press"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Aktifkan Scanner</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full sm:w-auto py-2.5 px-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer touch-press"
                        title="Ambil foto atau pilih gambar kartu QR dari kamera HP"
                      >
                        <Upload className="w-4 h-4 text-slate-600" />
                        <span>Foto QR</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Last Scan Result Banner */}
          {lastScannedResult && (
            <div
              className={`w-full p-4 rounded-2xl border text-xs flex items-start space-x-3 ${
                lastScannedResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : lastScannedResult.isSuspicious
                  ? 'bg-rose-100 border-rose-300 text-rose-900 shadow-md ring-2 ring-rose-400/40'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {lastScannedResult.success ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              )}
              <div className="flex-1">
                {lastScannedResult.isSuspicious && (
                  <span className="inline-block px-2.5 py-0.5 mb-1.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white uppercase tracking-wider shadow-xs">
                    ⚠️ Terdeteksi Titip Absen / Screenshot
                  </span>
                )}
                <p className="font-bold text-sm leading-snug">{lastScannedResult.message}</p>
                {lastScannedResult.student && (
                  <p className="text-xs text-slate-600 mt-1 font-medium">
                    {lastScannedResult.student.nama} • Absen #{lastScannedResult.student.nomor_absen} • {lastScannedResult.student.kelas}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Titik Lokasi Absensi Siswa Card (Muncul otomatis saat berhasil scan QR atau input siswa) */}
          {lastScannedResult?.record && (
            <AttendanceLocationCard
              record={lastScannedResult.record}
              student={lastScannedResult.student}
              onClose={() => setLastScannedResult(null)}
              title={lastScannedResult.success ? "Titik Lokasi Presensi Siswa (Iframe Maps)" : "Titik Lokasi Siswa Terdeteksi (Ditolak)"}
            />
          )}
        </div>

        {/* Right Side: Manual Search & Live Stream */}
        <div className="space-y-6">
          {/* Quick Manual Search (Bila HP Siswa Rusak / Lowbat) */}
          <div className="glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4 bg-white/95">
            <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center">
              <Search className="w-4 h-4 mr-1.5 text-blue-600" />
              Absenkan Manual (Cari Nama / No. Absen)
            </h3>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama siswa atau no absen (1-45)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-blue-600"
              />
            </div>

            {searchQuery && (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pt-1">
                {filteredStudents.length > 0 ? (
                  filteredStudents.slice(0, 5).map((std) => (
                    <div
                      key={std.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">#{std.nomor_absen} {std.nama}</span>
                        <span className="text-[10px] text-slate-500 block font-mono">NIS: {std.nis}</span>
                      </div>
                      <button
                        onClick={() => handleManualMark(std)}
                        className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Tandai {selectedStatus}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-2 text-center">Siswa tidak ditemukan</p>
                )}
              </div>
            )}
          </div>

          {/* Recent Scans Stream */}
          <div className="glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3 bg-white/95">
            <h3 className="text-sm font-bold text-slate-900 font-heading">
              Siswa yang Baru Saja Discan ({recentScans.length})
            </h3>

            {recentScans.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {recentScans.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">
                        #{item.student.nomor_absen} {item.student.nama}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Pukul {item.time} WIB</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={item.status} size="sm" />
                      {item.record && (
                        <button
                          type="button"
                          onClick={() => setSelectedLocationRecord({ record: item.record!, student: item.student })}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs transition-all cursor-pointer flex items-center space-x-1 text-[10px] font-bold"
                          title="Lihat Titik Lokasi Siswa"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">Titik Lokasi</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">
                Belum ada siswa yang discan pada sesi ini.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal Detail Titik Lokasi Siswa */}
      {selectedLocationRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full animate-in zoom-in-95 duration-200">
            <AttendanceLocationCard
              record={selectedLocationRecord.record}
              student={selectedLocationRecord.student}
              onClose={() => setSelectedLocationRecord(null)}
              title="Titik Lokasi Presensi Siswa"
            />
          </div>
        </div>
      )}
    </div>
  );
};
