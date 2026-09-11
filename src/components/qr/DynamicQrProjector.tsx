import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { dataStore } from '../../services/dataStore';
import type { AttendanceSession } from '../../types/database';
import { 
  RotateCw, 
  Maximize2, 
  Minimize2,
  Clock, 
  ShieldCheck, 
  CheckCircle2,
  MapPin
} from 'lucide-react';

interface DynamicQrProjectorProps {
  session: AttendanceSession;
}

export const DynamicQrProjector: React.FC<DynamicQrProjectorProps> = ({ session }) => {
  const [tokenData, setTokenData] = useState(() => 
    dataStore.getOrGenerateDynamicQr(session.id, session.qr_expiry_seconds || 30)
  );
  const [secondsLeft, setSecondsLeft] = useState(tokenData.remainingSeconds);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync attendance count
  useEffect(() => {
    const updateCount = () => {
      const records = dataStore.getAttendance().filter(a => a.session_id === session.id);
      setAttendanceCount(records.length);
    };
    updateCount();
    return dataStore.subscribe(updateCount);
  }, [session.id]);

  // Tick countdown timer & refresh token upon expiration
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((tokenData.expiresAt - now) / 1000));
      
      if (diff <= 0) {
        // Regenerate new dynamic token
        const next = dataStore.getOrGenerateDynamicQr(session.id, session.qr_expiry_seconds || 30);
        setTokenData(next);
        setSecondsLeft(next.remainingSeconds);
      } else {
        setSecondsLeft(diff);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenData.expiresAt, session.id, session.qr_expiry_seconds]);

  const handleManualRefresh = () => {
    const next = dataStore.getOrGenerateDynamicQr(session.id, session.qr_expiry_seconds || 30);
    setTokenData(next);
    setSecondsLeft(next.remainingSeconds);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const progressPercent = ((secondsLeft) / (session.qr_expiry_seconds || 30)) * 100;

  return (
    <div className={`glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden bg-white/95 mx-auto max-w-xl w-full transition-all ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none max-w-none w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 sm:p-10 overflow-y-auto' : ''
    }`}>
      {/* Decorative pulse blur */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info */}
      <div className={`w-full flex items-center justify-between pb-4 border-b ${isFullscreen ? 'border-slate-800 max-w-lg' : 'border-slate-100'}`}>
        <div className="flex items-center space-x-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className={`text-xs font-bold uppercase tracking-wider ${isFullscreen ? 'text-emerald-400' : 'text-emerald-700'}`}>
            DYNAMIC QR ADMIN PROYEKSI
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualRefresh}
            title="Refresh Token QR"
            className={`p-2 rounded-xl transition-colors cursor-pointer ${isFullscreen ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen Projector'}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${isFullscreen ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Session Title */}
      <div className="mt-5 mb-4 text-center">
        <h2 className={`text-2xl sm:text-3xl font-extrabold font-heading ${isFullscreen ? 'text-white' : 'text-slate-900'}`}>
          {session.nama_sesi}
        </h2>
        <p className={`text-xs sm:text-sm mt-1 flex items-center justify-center space-x-2 ${isFullscreen ? 'text-slate-400' : 'text-slate-500'}`}>
          <span>XI PPLG 3 • SMKN 1 Ciomas</span>
          <span>•</span>
          <span className="flex items-center text-blue-500 font-semibold">
            <MapPin className="w-3.5 h-3.5 mr-1" />
            Radius: {session.radius_meter}m
          </span>
        </p>
      </div>

      {/* QR Code Container in Center with High Contrast */}
      <div className={`relative my-4 p-5 sm:p-6 rounded-3xl shadow-2xl flex items-center justify-center mx-auto border-4 ${
        isFullscreen 
          ? 'bg-white border-blue-500/50 shadow-blue-500/20' 
          : 'bg-white shadow-blue-500/10 border-blue-100'
      }`}>
        <QRCodeSVG
          value={tokenData.token}
          size={isFullscreen ? 300 : 230}
          level="H"
          includeMargin={false}
        />
      </div>

      {/* Countdown Timer & Progress Bar */}
      <div className="w-full max-w-xs space-y-2 mt-2 mx-auto">
        <div className={`flex items-center justify-between text-xs font-bold ${isFullscreen ? 'text-slate-300' : 'text-slate-700'}`}>
          <span className="flex items-center text-amber-500">
            <Clock className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            QR Expired dalam:
          </span>
          <span className="font-mono text-base font-bold text-blue-600">
            {secondsLeft} detik
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear rounded-full ${
              secondsLeft > 10 ? 'bg-blue-600' : 'bg-rose-500 animate-pulse'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Live Presence Counter */}
      <div className={`mt-8 pt-4 border-t w-full max-w-md mx-auto grid grid-cols-2 gap-4 ${
        isFullscreen ? 'border-slate-800' : 'border-slate-100'
      }`}>
        <div className={`p-3.5 rounded-2xl flex items-center space-x-3 ${
          isFullscreen 
            ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' 
            : 'bg-emerald-50/70 border border-emerald-100'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isFullscreen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className={`text-[10px] uppercase font-bold ${isFullscreen ? 'text-emerald-300' : 'text-emerald-800'}`}>Tercatat Hadir</span>
            <p className={`text-lg font-extrabold font-mono ${isFullscreen ? 'text-emerald-400' : 'text-emerald-700'}`}>
              {attendanceCount} <span className="text-xs text-slate-400 font-normal">/ 45 Siswa</span>
            </p>
          </div>
        </div>

        <div className={`p-3.5 rounded-2xl flex items-center space-x-3 ${
          isFullscreen 
            ? 'bg-blue-950/40 border border-blue-500/30 text-blue-400' 
            : 'bg-blue-50/70 border border-blue-100'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isFullscreen ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className={`text-[10px] uppercase font-bold ${isFullscreen ? 'text-blue-300' : 'text-blue-800'}`}>Anti-Titip Absen</span>
            <p className={`text-xs font-bold ${isFullscreen ? 'text-blue-400' : 'text-blue-700'}`}>GPS + Device OK</p>
          </div>
        </div>
      </div>
    </div>
  );
};
