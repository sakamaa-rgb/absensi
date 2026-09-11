import React, { useState, useEffect } from 'react';
import { dataStore } from '../../services/dataStore';
import type { ActivityLog } from '../../types/database';
import { 
  Search, 
  Smartphone 
} from 'lucide-react';


export const AdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const refresh = () => setLogs(dataStore.getLogs());
    refresh();
    return dataStore.subscribe(refresh);
  }, []);

  const actionList = [
    'ALL',
    'LOGIN',
    'LOGOUT',
    'QR_SCANNED',
    'QR_EXPIRED',
    'LOCATION_CHECKED',
    'LOCATION_REJECTED',
    'DEVICE_CHECKED',
    'DEVICE_REJECTED',
    'FACE_VERIFIED',
    'FACE_FAILED',
    'ATTENDANCE_SUCCESS',
    'ATTENDANCE_FAILED',
    'EXPORT_EXCEL',
    'EXPORT_PDF',
    'RESET_DEVICE',
    'ADMIN_SCAN_ATTENDANCE',
    'UPDATE_ATTENDANCE_STATUS',
  ];

  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== 'ALL' && log.action !== selectedAction) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = log.description?.toLowerCase().includes(q);
      const matchAction = log.action.toLowerCase().includes(q);
      return matchDesc || matchAction;
    }
    return true;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('SUCCESS') || action.includes('HADIR')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('REJECTED') || action.includes('FAILED')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (action.includes('TERLAMBAT')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (action.includes('EXPORT') || action === 'RESET_DEVICE') {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
          Activity Logs & Audit Trail
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Rekam jejak setiap aktivitas autentikasi, scanning, validasi GPS, dan tindakan admin
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-200/90 shadow-xs bg-white/95 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari deskripsi aktivitas atau siswa..."
              className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2 text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs cursor-pointer border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {actionList.map((act) => (
                <option key={act} value={act}>
                  {act === 'ALL' ? 'Semua Action Log' : act}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden bg-white/95">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                <th className="py-3 px-4 font-bold w-28">Waktu</th>
                <th className="py-3 px-4 font-bold w-40">Action</th>
                <th className="py-3 px-4 font-bold">Deskripsi Aktivitas</th>
                <th className="py-3 px-4 font-bold w-48">Device Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                    {new Date(log.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border ${getActionBadgeColor(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {log.description}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] truncate">
                    {log.device_info ? (
                      <span className="flex items-center space-x-1">
                        <Smartphone className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span className="truncate">{log.device_info.platform || 'Browser'}</span>
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
