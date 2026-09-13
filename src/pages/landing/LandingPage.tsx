import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { dataStore } from '../../services/dataStore';
import { AnimatedBackground } from '../../components/common/AnimatedBackground';
import { RealtimeConnectionBadge } from '../../components/common/RealtimeConnectionBadge';
import { 
  LogIn, 
  MapPin, 
  Clock, 
  QrCode, 
  Smartphone, 
  ArrowRight, 
  CheckCircle2, 
  FileSpreadsheet, 
  Users, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  // Live DataStore connection (Auto-syncs whenever Admin updates anything on Mobile/PC)
  const [studentsCount, setStudentsCount] = useState(() => dataStore.getStudents().length);
  const [activeSession, setActiveSession] = useState(() => dataStore.getActiveSession());
  const [settings, setSettings] = useState(() => dataStore.getSettings());

  useEffect(() => {
    void dataStore.syncWithSupabase();
    const syncFromStore = () => {
      setStudentsCount(dataStore.getStudents().length);
      setActiveSession(dataStore.getActiveSession());
      setSettings(dataStore.getSettings());
    };

    syncFromStore();
    return dataStore.subscribe(syncFromStore);
  }, []);

  // Live WIB Clock
  const [timeString, setTimeString] = useState('');
  const [dateString, setDateString] = useState('');
  const qrInterval = activeSession?.qr_expiry_seconds || settings?.default_qr_expiry_seconds || 30;
  const [previewSeconds, setPreviewSeconds] = useState(qrInterval);

  // Desktop Special Effect: Interactive Mouse Glow & Cursor Spotlight
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -1000, y: -1000 });

  // Desktop Special Effect: 3D Tilt Card Perspective
  const [cardTilt, setCardTilt] = useState<{ rotateX: number; rotateY: number }>({ rotateX: 0, rotateY: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Mobile Special Effect: Touch Ripple Effect
  const [touchPos, setTouchPos] = useState<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Jakarta',
        }) + ' WIB'
      );
      setDateString(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Demo countdown for dynamic QR based on actual setting
  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewSeconds((prev: number) => (prev <= 1 ? qrInterval : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [qrInterval]);

  const handleMouseMoveGlobal = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    setCardTilt({ rotateX, rotateY });
  };

  const handleCardMouseLeave = () => {
    setCardTilt({ rotateX: 0, rotateY: 0 });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      setTouchPos({ x: e.touches[0].clientX, y: e.touches[0].clientY, active: true });
    }
  };

  const handleTouchEnd = () => {
    setTimeout(() => {
      setTouchPos(prev => ({ ...prev, active: false }));
    }, 400);
  };

  const handleDashboardRedirect = () => {
    if (role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/student/dashboard');
    }
  };

  return (
    <div 
      onMouseMove={handleMouseMoveGlobal}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen text-slate-800 flex flex-col relative selection:bg-blue-600 selection:text-white overflow-x-hidden"
    >
      {/* Animated Clean Background */}
      <AnimatedBackground />

      {/* Desktop Special Effect: Interactive Mouse Glow / Cursor Spotlight (Hidden on Mobile) */}
      <div 
        className="pointer-events-none fixed inset-0 z-10 transition-opacity duration-300 hidden lg:block"
        style={{
          background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(59, 130, 246, 0.08), transparent 80%)`,
        }}
      />

      {/* Mobile Special Effect: Subtle Touch Aura */}
      {touchPos.active && (
        <div 
          className="pointer-events-none fixed z-10 rounded-full bg-blue-500/10 blur-xl transition-all duration-300 lg:hidden"
          style={{
            width: 140,
            height: 140,
            left: touchPos.x - 70,
            top: touchPos.y - 70,
          }}
        />
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-3">
          {/* Logo & School Badge */}
          <Link to="/" className="flex items-center space-x-2.5 sm:space-x-3 group shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white p-1 border border-slate-200 shadow-xs group-hover:scale-105 transition-transform overflow-hidden flex items-center justify-center shrink-0">
              <img 
                src="/logo-pplg3.png" 
                alt="Logo XI PPLG 3" 
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight font-heading whitespace-nowrap">
                  PPLG 3
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 whitespace-nowrap">
                  SMKN 1 CIOMAS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block whitespace-nowrap">
                Smart Attendance System • XI PPLG 3
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center space-x-1 text-xs sm:text-sm font-semibold text-slate-600 shrink-0">
            <a href="#features" className="px-3 py-1.5 rounded-xl hover:text-blue-600 hover:bg-slate-100/80 transition-all">
              Fitur Keamanan
            </a>
            <a href="#how-it-works" className="px-3 py-1.5 rounded-xl hover:text-blue-600 hover:bg-slate-100/80 transition-all">
              Cara Kerja
            </a>
            <a href="#schedule" className="px-3 py-1.5 rounded-xl hover:text-blue-600 hover:bg-slate-100/80 transition-all">
              Jadwal & Aturan
            </a>
            <Link to="/verify" className="px-3 py-1.5 rounded-xl hover:text-blue-600 hover:bg-slate-100/80 transition-all inline-flex items-center space-x-1">
              <span>Cek Bukti</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </nav>

          {/* Right Action: Status & Login Button */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Subtle Live Realtime Pulse Badge on desktop */}
            <div className="hidden xl:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Realtime Aktif</span>
            </div>

            {isAuthenticated ? (
              <button
                onClick={handleDashboardRedirect}
                className="inline-flex items-center space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <span>Dashboard ({role === 'admin' ? 'Admin' : 'Siswa'})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 transition-all active:scale-95 whitespace-nowrap"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk / Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 lg:pb-0">
        {/* Hero Section */}
        <section className="relative pt-8 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              
              {/* Left Column: Heading & CTA */}
              <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-center lg:text-left">
                {/* Badge Pill with Cross-Device Mesh Indicator */}
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 border border-blue-200/90 text-blue-700 shadow-xs">
                  <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                  <span className="text-xs font-bold tracking-wide">
                    Sistem Absensi Digital Terkoneksi Real-Time (Window & Mobile)
                  </span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight font-heading leading-tight">
                  Absensi Cerdas, <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
                    Akurat & 100% Bebas
                  </span>{' '}
                  Titip Absen.
                </h1>

                <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                  Platform presisi khusus <strong className="text-slate-800 font-semibold">45 siswa XI PPLG 3</strong> dengan multi-layer security: Dynamic QR 30 detik, Live GPS adaptif sesuai lokasi siswa, Single-Device binding, dan sinkronisasi real-time instan antar-perangkat PC & HP.
                </p>

                {/* CTA Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-3.5">
                  <Link
                    to="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-6 sm:px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-xl shadow-blue-600/25 hover:shadow-2xl hover:shadow-blue-600/35 transition-all transform hover:-translate-y-0.5 active:scale-95"
                  >
                    <span>Mulai Absensi Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <a
                    href="#features"
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 sm:px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-xs hover:shadow transition-all active:scale-95"
                  >
                    <span>Pelajari Sistem Keamanan</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </a>
                </div>

                {/* Key Stats Bar - Dynamically Connected to Admin & School Settings */}
                <div className="pt-4 sm:pt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 max-w-xl mx-auto lg:mx-0 text-left">
                  <div className="p-3 rounded-2xl bg-white/85 border border-slate-200/80 shadow-xs hover-lift transition-transform">
                    <p className="text-xl sm:text-2xl font-extrabold text-blue-600 font-heading">
                      {studentsCount}
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-500">Siswa Terdaftar</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/85 border border-slate-200/80 shadow-xs hover-lift transition-transform">
                    <p className="text-xl sm:text-2xl font-extrabold text-indigo-600 font-heading">
                      Live GPS
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-500">Sesuai Posisi Siswa</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/85 border border-slate-200/80 shadow-xs hover-lift transition-transform">
                    <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-heading">
                      {qrInterval}s
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-500">Rotasi Dynamic QR</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/85 border border-slate-200/80 shadow-xs hover-lift transition-transform">
                    <p className="text-xl sm:text-2xl font-extrabold text-amber-600 font-heading">
                      {activeSession?.batas_terlambat || settings?.late_threshold_time || '06:45'}
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-medium text-slate-500">Batas Waktu Masuk</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Live Preview Card with 3D Tilt Effect on Desktop */}
              <div className="lg:col-span-5 flex justify-center">
                <div 
                  ref={cardRef}
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                  style={{
                    transform: `perspective(1000px) rotateX(${cardTilt.rotateX}deg) rotateY(${cardTilt.rotateY}deg)`,
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="w-full max-w-md glass-card rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-2xl relative overflow-hidden bg-white/95"
                >
                  {/* Subtle Card Ambient Glow */}
                  <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Card Header with Live Time */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        {activeSession ? 'Sesi Absensi Aktif' : 'Sesi Ditutup'}
                      </span>
                    </div>

                    <div className="flex items-center text-xs font-semibold text-slate-500">
                      <Clock className="w-3.5 h-3.5 mr-1 text-blue-600" />
                      <span className="font-mono">{timeString || 'WIB'}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="py-5 sm:py-6 text-center">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      {dateString || 'Hari Ini'}
                    </p>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-heading">
                      XI PPLG 3 • {activeSession?.nama_sesi || 'Sesi Absensi'}
                    </h3>

                    {/* QR Preview Box with Pulsing Active Ring */}
                    <div className="relative my-4 sm:my-5 inline-block p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-blue-300 group">
                      <div className="w-36 h-36 sm:w-40 sm:h-40 bg-white rounded-xl shadow-inner flex flex-col items-center justify-center p-3 border border-slate-200">
                        <QrCode className="w-24 h-24 sm:w-28 sm:h-28 text-slate-800 transition-transform group-hover:scale-105" />
                        <span className="text-[10px] font-mono font-bold text-blue-600 mt-1">
                          TOKEN-{previewSeconds}S
                        </span>
                      </div>
                    </div>

                    {/* Countdown Progress Bar */}
                    <div className="max-w-xs mx-auto space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span className="text-slate-500">Rotasi Token QR:</span>
                        <span className="font-mono text-blue-600 font-bold">{previewSeconds} detik</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-1000 ease-linear"
                          style={{ width: `${(previewSeconds / qrInterval) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Anti-Cheat Badges */}
                  <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2.5 sm:gap-3 text-left">
                    <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center space-x-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase">Geofence</p>
                        <p className="text-[11px] sm:text-xs font-bold text-slate-700 truncate">SMKN 1 Ciomas</p>
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center space-x-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase">Device Binding</p>
                        <p className="text-[11px] sm:text-xs font-bold text-slate-700 truncate">1 HP 1 Siswa</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-14 sm:py-20 bg-white/70 border-y border-slate-200/80 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                SISTEM MULTI-LAYER ANTI-CHEAT
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-heading">
                Keamanan Maksimal, Kejujuran Terjamin
              </h2>
              <p className="text-slate-600 text-xs sm:text-base">
                Dirancang khusus untuk menghentikan segala modus titip absen secara cerdas dan otomatis.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Feature 1 */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow hover-lift">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 sm:mb-5 border border-blue-100">
                  <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 font-heading">Dynamic QR Token</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  QR proyektor kelas berganti token setiap 30 detik. Tangkapan layar (screenshot) langsung kadaluarsa dan ditolak sistem.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow hover-lift">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 sm:mb-5 border border-emerald-100">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 font-heading">Live GPS Sesuai Lokasi Siswa</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Sistem secara otomatis mendeteksi, menghitung jarak, dan mencatat koordinat lokasi riil HP siswa saat melakukan absensi secara akurat dan transparan.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow hover-lift">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 sm:mb-5 border border-indigo-100">
                  <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 font-heading">Device Fingerprint</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Setiap akun siswa dikunci ke 1 perangkat HP. Tidak bisa menitipkan akun kepada teman sekelas untuk absen.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow hover-lift">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 sm:mb-5 border border-purple-100">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 font-heading">Real-Time Sync Panel</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Setiap perubahan oleh Admin di HP langsung tersinkronkan ke layar PC Windows proyektor kelas tanpa jeda reload manual.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-14 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                ALUR MUDAH & CEPAT
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-heading">
                Cara Melakukan Absensi di Kelas
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <div className="p-6 rounded-3xl bg-white/90 border border-slate-200 shadow-xs relative hover-lift transition-transform">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center mb-4 shadow-sm">
                  1
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2 font-heading">Login Akun Siswa</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Masuk menggunakan email akun kelas yang telah terdaftar dan nomor NISN masing-masing sebagai password awal.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-white/90 border border-slate-200 shadow-xs relative hover-lift transition-transform">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center mb-4 shadow-sm">
                  2
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2 font-heading">Buka Menu Scan QR</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Arahkan kamera HP ke Dynamic QR di layar proyektor kelas atau tunjukkan QR Siswa kepada Ketua Kelas / Admin.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-white/90 border border-slate-200 shadow-xs relative hover-lift transition-transform">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center mb-4 shadow-sm">
                  3
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2 font-heading">Terverifikasi & Unduh Slip</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Sistem langsung memvalidasi jarak GPS, waktu WIB, dan mengeluarkan Bukti Kehadiran Digital resmi bertanda QR.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Schedule & Rules Section */}
        <section id="schedule" className="py-14 sm:py-20 bg-white/70 border-t border-slate-200/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-200 bg-white/15 px-3 py-1 rounded-full">
                    STANDAR DISIPLIN KELAS
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold mt-3 font-heading">
                    Aturan Batas Waktu & Keterlambatan
                  </h3>
                  <p className="text-blue-100 text-xs sm:text-sm mt-3 leading-relaxed">
                    Setiap siswa XI PPLG 3 wajib melakukan presensi sebelum jam masuk pembelajaran dimulai.
                  </p>
                  
                  <div className="mt-6 space-y-2.5 text-xs">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span><strong>Tepat Waktu:</strong> Sebelum pukul 06:45 WIB</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                      <span><strong>Terlambat:</strong> Pukul 06:46 WIB ke atas (otomatis tercatat status terlambat)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="w-4 h-4 text-sky-300 shrink-0" />
                      <span><strong>Izin / Sakit:</strong> Pengajuan disahkan langsung melalui Panel Admin</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/20 text-center">
                  <p className="text-xs uppercase font-semibold text-blue-200">Koordinat Resmi Sekolah</p>
                  <p className="text-base sm:text-lg font-mono font-extrabold text-white mt-1">-6.6025000, 106.7584000</p>
                  <p className="text-xs text-blue-100 mt-0.5">SMKN 1 Ciomas • Laladon, Kab. Bogor</p>
                  
                  <div className="mt-6 pt-5 border-t border-white/15">
                    <Link
                      to="/login"
                      className="w-full inline-flex items-center justify-center space-x-2 py-3 px-5 rounded-xl bg-white hover:bg-slate-100 text-blue-700 font-bold text-xs shadow-md transition-colors active:scale-95"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Masuk ke Akun Kelas</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Mobile Special Effect: Floating Quick-Dock Bar (Visible only on Mobile screens < lg) */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
        <div className="glass-card bg-white/92 backdrop-blur-xl border border-slate-200/90 shadow-2xl rounded-2xl p-2.5 flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2 min-w-0 pl-1">
            <RealtimeConnectionBadge showText={false} />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">XI PPLG 3 Presensi</p>
              <p className="text-[10px] text-slate-500 truncate">{timeString || 'WIB'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <Link
              to="/verify"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              title="Cek Bukti Presensi"
            >
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </Link>

            {isAuthenticated ? (
              <button
                onClick={handleDashboardRedirect}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-blue-600/20 active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-3">
            <img src="/logo-pplg3.png" alt="Logo XI PPLG 3" className="w-7 h-7 object-contain rounded-md" />
            <span className="font-bold text-slate-700">PPLG 3 SMART ATTENDANCE</span>
            <span>•</span>
            <span>XI PPLG 3 SMKN 1 Ciomas</span>
          </div>

          <p>© 2026 XI PPLG 3 SMKN 1 Ciomas. Hak Cipta Dilindungi.</p>
        </div>
      </footer>
    </div>
  );
};
