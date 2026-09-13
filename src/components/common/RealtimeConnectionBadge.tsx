import React, { useState, useEffect } from 'react';
import { dataStore } from '../../services/dataStore';
import { RefreshCw } from 'lucide-react';

interface RealtimeConnectionBadgeProps {
  className?: string;
  showText?: boolean;
}

export const RealtimeConnectionBadge: React.FC<RealtimeConnectionBadgeProps> = ({ 
  className = '', 
  showText = true 
}) => {
  const [status, setStatus] = useState(() => dataStore.getRealtimeStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncLabel, setLastSyncLabel] = useState('Baru saja');

  useEffect(() => {
    const update = () => {
      setStatus(dataStore.getRealtimeStatus());
    };
    update();
    const unsub = dataStore.subscribe(update);
    return unsub;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (status.lastSyncTime) {
        const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(status.lastSyncTime).getTime()) / 1000));
        if (diffSeconds < 10) {
          setLastSyncLabel('Baru saja');
        } else if (diffSeconds < 60) {
          setLastSyncLabel(`${diffSeconds}d lalu`);
        } else {
          setLastSyncLabel(`${Math.floor(diffSeconds / 60)}m lalu`);
        }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [status.lastSyncTime]);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSyncing(true);
    await dataStore.forceCloudSync();
    setTimeout(() => {
      setIsSyncing(false);
      setStatus(dataStore.getRealtimeStatus());
    }, 400);
  };

  return (
    <div 
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all select-none ${
        status.isConnected 
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-xs'
          : 'bg-amber-50 text-amber-700 border border-amber-200 shadow-xs'
      } ${className}`}
      title={`Status Koneksi Real-time Antar-Perangkat (Windows PC & Mobile HP). Terakhir sinkron: ${lastSyncLabel}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {status.isConnected && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span 
          className={`relative inline-flex rounded-full h-2 w-2 ${
            status.isConnected ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        ></span>
      </span>

      {showText && (
        <span className="flex items-center space-x-1">
          <span>{status.isConnected ? 'Realtime Aktif' : 'Menghubungkan'}</span>
          <span className="hidden sm:inline text-[9px] opacity-70">({lastSyncLabel})</span>
        </span>
      )}

      <button
        onClick={handleManualSync}
        disabled={isSyncing}
        className="p-0.5 rounded hover:bg-emerald-100/60 active:scale-95 transition-transform text-emerald-800 disabled:opacity-50 cursor-pointer"
        title="Sinkronkan data manual sekarang"
      >
        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};
