import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataStore } from '../../services/dataStore';
import type { AttendanceRecord } from '../../types/database';
import { AttendanceProofCard } from '../../components/attendance/AttendanceProofCard';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export const StudentAttendanceProof: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record] = useState<AttendanceRecord | null>(() => {
    return id ? (dataStore.getAttendanceByIdOrCode(id) || null) : null;
  });


  if (!record) {
    return (
      <div className="glass-card rounded-3xl p-8 max-w-md mx-auto text-center space-y-4 border border-slate-700">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white font-heading">Data Bukti Tidak Ditemukan</h2>
        <p className="text-xs text-slate-400">
          Bukti absensi dengan ID tersebut tidak ditemukan dalam sistem.
        </p>
        <button
          onClick={() => navigate('/student/history')}
          className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200"
        >
          Kembali ke Riwayat
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali</span>
      </button>

      <AttendanceProofCard record={record} />
    </div>
  );
};
