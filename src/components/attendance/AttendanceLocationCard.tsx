import React, { useState } from 'react';
import type { AttendanceRecord, Student } from '../../types/database';
import { 
  MapPin, 
  Navigation, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  X,
  Maximize2,
  Minimize2,
  Compass,
  Copy,
  Check
} from 'lucide-react';

interface AttendanceLocationCardProps {
  record?: AttendanceRecord | null;
  student?: Student | null;
  coords?: { latitude: number; longitude: number; accuracy?: number; distance?: number } | null;
  onClose?: () => void;
  title?: string;
  isCompact?: boolean;
  isLivePreview?: boolean;
  maxRadius?: number;
}

export const AttendanceLocationCard: React.FC<AttendanceLocationCardProps> = ({
  record,
  student,
  coords,
  onClose,
  title = 'Titik Lokasi Presensi Siswa',
  isCompact = false,
  isLivePreview = false,
  maxRadius = 100,
}) => {
  const [showMapModal, setShowMapModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentStudent = student || record?.student;
  const lat = coords?.latitude ?? record?.latitude ?? -6.6025000;
  const lng = coords?.longitude ?? record?.longitude ?? 106.7580556;
  const distance = coords?.distance ?? record?.distance ?? 0;
  const accuracy = coords?.accuracy ?? record?.accuracy ?? 5;

  const isWithinRadius = distance <= maxRadius;
  const mapUrl = `https://maps.google.com/maps?q=${lat},${lng}&hl=id&z=17&output=embed`;
  const externalMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const copyCoordinates = () => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className={`glass-card rounded-3xl border shadow-lg overflow-hidden bg-white/95 animate-in fade-in slide-in-from-top-3 duration-300 ${
        isWithinRadius ? 'border-emerald-200/90' : 'border-rose-200/90'
      }`}>
        {/* Header Banner */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isWithinRadius 
            ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border-emerald-100' 
            : 'bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 border-rose-100'
        }`}>
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <span className={`absolute w-6 h-6 rounded-full animate-ping ${isWithinRadius ? 'bg-emerald-400/40' : 'bg-rose-400/40'}`} />
              <div className={`relative w-8 h-8 rounded-xl text-white flex items-center justify-center shadow-md ${
                isWithinRadius ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-rose-500 shadow-rose-500/30'
              }`}>
                <MapPin className="w-4 h-4 animate-bounce" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 font-heading truncate">
                  {title}
                </h4>
                {isWithinRadius ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center shrink-0">
                    <ShieldCheck className="w-3 h-3 mr-0.5 text-emerald-600" />
                    {isLivePreview ? 'Area Sekolah' : 'Valid'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center shrink-0">
                    <AlertTriangle className="w-3 h-3 mr-0.5 text-rose-600" />
                    Di Luar Radius
                  </span>
                )}
              </div>
              {currentStudent && (
                <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                  #{currentStudent.nomor_absen} {currentStudent.nama} • {currentStudent.kelas}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
            <button
              onClick={() => setShowMapModal(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-blue-600 text-[11px] font-bold border border-slate-200 shadow-xs transition-all cursor-pointer touch-manipulation"
              title="Perbesar Peta"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Perbesar</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer touch-manipulation"
                title="Tutup Titik Lokasi"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Embedded Interactive Map Box (Clickable on Mobile & Desktop) */}
        <div 
          onClick={() => setShowMapModal(true)}
          className={`relative w-full ${isCompact ? 'h-36 sm:h-44' : 'h-48 sm:h-56'} bg-slate-100 border-b border-slate-200/80 overflow-hidden cursor-pointer group select-none`}
          title="Ketuk untuk berinteraksi dengan peta layar penuh"
        >
          {/* Iframe with pointer-events-none so mobile page scrolling is never frozen */}
          <iframe
            title="Titik Lokasi Presensi Siswa"
            src={mapUrl}
            className="w-full h-full border-0 filter contrast-[1.02] pointer-events-none group-hover:scale-[1.02] transition-transform duration-500"
            loading="lazy"
          />

          {/* Interactive Tap Hint Overlay */}
          <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/25 transition-colors flex items-center justify-center p-3">
            <div className="px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md text-slate-900 text-xs font-bold shadow-xl border border-white/80 flex items-center space-x-2 transform group-hover:scale-105 transition-all">
              <Compass className="w-4 h-4 text-blue-600 animate-spin" style={{ animationDuration: '8s' }} />
              <span>Ketuk untuk Buka & Geser Peta ↗</span>
            </div>
          </div>

          {/* Floating Pin Overlay Label */}
          <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
            <div className="px-2.5 py-1 rounded-xl bg-slate-900/85 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-semibold border border-white/15 shadow-xl flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isWithinRadius ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span>{isLivePreview ? 'GPS Live Siswa' : 'Lokasi Terverifikasi'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Quick Action Buttons Bar */}
        <div className="p-3 bg-slate-50/70 border-b border-slate-100 grid grid-cols-2 gap-2">
          <a
            href={externalMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-600 text-xs font-bold border border-slate-200 shadow-xs transition-all touch-manipulation"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka Google Maps</span>
          </a>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-1.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all touch-manipulation"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Petunjuk Arah</span>
          </a>
        </div>

        {/* Details Grid */}
        <div className="p-4 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Location Name & Distance */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start space-x-2.5">
              <Navigation className={`w-4 h-4 shrink-0 mt-0.5 ${isWithinRadius ? 'text-emerald-600' : 'text-rose-600'}`} />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Jarak ke Sekolah</span>
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm block">
                  {Math.round(distance)} meter dari SMKN 1 Ciomas
                </span>
                <span className={`text-[11px] block font-semibold mt-0.5 ${isWithinRadius ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isWithinRadius ? `✓ Aman di dalam radius (maks ${maxRadius}m)` : `⚠️ Di luar radius sekolah (maks ${maxRadius}m)`}
                </span>
              </div>
            </div>

            {/* Coordinates */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start space-x-2.5">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Koordinat GPS</span>
                  <button
                    type="button"
                    onClick={copyCoordinates}
                    className="text-[10px] text-blue-600 hover:underline flex items-center font-semibold cursor-pointer"
                    title="Salin Koordinat"
                  >
                    {copied ? <Check className="w-3 h-3 mr-0.5 text-emerald-600" /> : <Copy className="w-3 h-3 mr-0.5" />}
                    {copied ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
                <span className="font-mono font-bold text-slate-800 text-xs block truncate mt-0.5">
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                  Akurasi sensor HP: ±{Math.round(accuracy)} meter
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Status bar */}
          <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-slate-500">
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {record?.waktu 
                  ? <>Tercatat pukul <strong className="text-slate-700">{record.waktu} WIB</strong></>
                  : <>Waktu Cek: <strong className="text-slate-700">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</strong></>
                }
              </span>
            </div>

            <div className={`flex items-center space-x-1 font-semibold ${isWithinRadius ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isWithinRadius ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Lokasi SMKN 1 Ciomas Valid</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>QR Dikunci (Di luar area sekolah)</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN / EXPANDED INTERACTIVE MAP MODAL (Touch, Pan, Pinch-to-Zoom Friendly) */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex flex-col justify-end sm:justify-center p-0 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] sm:h-[85vh] flex flex-col overflow-hidden border border-slate-200/80">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 font-heading">
                    Peta Interaktif Google Maps
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {lat.toFixed(6)}, {lng.toFixed(6)} • Jarak: {Math.round(distance)}m
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowMapModal(false)}
                className="p-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer touch-manipulation"
                title="Tutup Peta"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Fully Interactive Iframe Map (Pointer Events ACTIVE) */}
            <div className="flex-1 w-full h-full relative bg-slate-100">
              <iframe
                title="Google Maps Interaktif"
                src={mapUrl}
                className="w-full h-full border-0 pointer-events-auto"
                allowFullScreen
                loading="eager"
              />
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <a
                  href={externalMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all touch-manipulation"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka di Aplikasi Google Maps</span>
                </a>

                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all touch-manipulation"
                >
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  <span>Navigasi Rute</span>
                </a>
              </div>

              <button
                onClick={() => setShowMapModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer touch-manipulation"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
