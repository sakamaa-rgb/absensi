import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { dataStore } from '../../services/dataStore';
import type { AttendanceRecord } from '../../types/database';
import { StatusBadge } from '../../components/attendance/StatusBadge';
import { exportSingleAttendanceSlipPDF } from '../../lib/pdfExport';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronRight, 
  Download, 
  FileText 
} from 'lucide-react';

export const StudentHistory: React.FC = () => {
  const { student } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  useEffect(() => {
    if (!student) return;

    const loadRecords = () => {
      const data = dataStore.getAttendanceByStudent(student.id);
      setRecords(data);
    };

    loadRecords();
    return dataStore.subscribe(loadRecords);
  }, [student]);

  const filteredRecords = records.filter(rec => {
    if (selectedStatus === 'ALL') return true;
    return rec.status === selectedStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
          Riwayat Absensi Saya
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Daftar seluruh catatan kehadiran kamu di kelas XI PPLG 3
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 scrollbar-none">
        {['ALL', 'HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPHA'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedStatus === st
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            {st === 'ALL' ? 'Semua Status' : st}
          </button>
        ))}
      </div>

      {/* Records List */}
      {filteredRecords.length > 0 ? (
        <div className="space-y-3">
          {filteredRecords.map((rec) => (
            <div
              key={rec.id}
              className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300 bg-white/95"
            >
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-900 font-heading">{rec.tanggal}</span>
                    <StatusBadge status={rec.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {rec.session?.nama_sesi || 'Absensi Pagi'}
                  </p>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-2">
                    <span className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-blue-600" />
                      {rec.waktu} WIB
                    </span>
                    <span>•</span>
                    <span className="flex items-center text-emerald-600 font-medium">
                      <MapPin className="w-3.5 h-3.5 mr-1" />
                      {rec.distance ? `${Math.round(rec.distance)}m` : '0m'}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-slate-400">{rec.attendance_code}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-center">
                <button
                  onClick={() => exportSingleAttendanceSlipPDF(rec)}
                  title="Download Slip PDF"
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>
                <Link
                  to={`/student/attendance/${rec.id}`}
                  className="flex items-center space-x-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-700 text-xs font-bold border border-blue-200 transition-all"
                >
                  <span>Lihat Bukti</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-8 border border-slate-200 text-center space-y-3 bg-white/95">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Belum Ada Riwayat Absensi</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Catatan kehadiran kamu akan muncul otomatis setelah kamu melakukan absensi sesi kelas.
          </p>
        </div>
      )}
    </div>
  );
};
