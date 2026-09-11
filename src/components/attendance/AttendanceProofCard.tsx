import React from 'react';
import type { AttendanceRecord } from '../../types/database';
import { StatusBadge } from './StatusBadge';
import { QRCodeSVG } from 'qrcode.react';
import { exportSingleAttendanceSlipPDF } from '../../lib/pdfExport';
import { 
  CheckCircle2, 
  MapPin, 
  Clock, 
  Calendar, 
  Smartphone, 
  Download,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface AttendanceProofCardProps {
  record: AttendanceRecord;
}

export const AttendanceProofCard: React.FC<AttendanceProofCardProps> = ({ record }) => {
  const verifyUrl = `${window.location.origin}/verify/${record.attendance_code}`;

  return (
    <div className="glass-card rounded-3xl p-6 border border-slate-200/90 shadow-lg relative overflow-hidden bg-white/95 text-slate-800">
      {/* Decorative gradient blur */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-100/50 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-emerald-100/50 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between pb-5 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
            <img src="/logo-pplg3.png" alt="Logo XI PPLG 3" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900 font-heading">Bukti Digital Absensi</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">XI PPLG 3 • SMKN 1 Ciomas</p>
          </div>
        </div>
        <StatusBadge status={record.status} size="md" />
      </div>

      {/* Content Details */}
      <div className="py-5 space-y-3.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Nama Siswa</span>
          <span className="text-sm font-bold text-slate-900">{record.student?.nama || '-'}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500">Nomor Absen / NIS</span>
          <span className="font-semibold text-slate-700">
            #{record.student?.nomor_absen || '-'} • NIS: {record.student?.nis || '-'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Tanggal</span>
          </div>
          <span className="font-semibold text-slate-800">{record.tanggal}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-slate-500">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Waktu Absen</span>
          </div>
          <span className="font-semibold text-slate-800">{record.waktu} WIB</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Jarak dari Sekolah</span>
          </div>
          <span className="font-semibold text-emerald-700">
            {record.distance !== undefined && record.distance !== null 
              ? `${Math.round(record.distance)} meter (Valid)` 
              : 'Tervalidasi'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-slate-500">
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span>Device</span>
          </div>
          <span className="font-semibold text-indigo-700">
            {record.device_token ? 'Verified Mobile' : 'Verified'}
          </span>
        </div>

        {record.face_verified && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-slate-500">
              <UserCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Verifikasi Wajah</span>
            </div>
            <span className="font-semibold text-purple-700">Verified</span>
          </div>
        )}
      </div>

      {/* Attendance ID & QR Code for Public Verification */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Attendance ID</span>
          <p className="font-mono text-xs font-bold text-blue-600 tracking-wider select-all mt-0.5">
            {record.attendance_code}
          </p>
          <span className="text-[10px] text-emerald-700 flex items-center mt-1 font-semibold">
            <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
            Terverifikasi Sistem
          </span>
        </div>

        <div className="p-1.5 bg-white rounded-xl shadow-xs border border-slate-200">
          <QRCodeSVG value={verifyUrl} size={64} level="M" />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 pt-2">
        <button
          onClick={() => exportSingleAttendanceSlipPDF(record)}
          className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download Bukti PDF</span>
        </button>
      </div>
    </div>
  );
};
