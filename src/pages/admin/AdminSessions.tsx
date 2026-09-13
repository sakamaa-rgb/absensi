import React, { useState, useEffect } from 'react';
import { dataStore } from '../../services/dataStore';
import type { AttendanceSession } from '../../types/database';
import { 
  Plus, 
  Play, 
  Square, 
  Clock, 
  X,
  Radio
} from 'lucide-react';


export const AdminSessions: React.FC = () => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [activeSession, setActiveSession] = useState<AttendanceSession | undefined>();
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formNama, setFormNama] = useState('Absensi Pagi - XI PPLG 3');
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [formMulai, setFormMulai] = useState('06:30');
  const [formSelesai, setFormSelesai] = useState('07:30');
  const [formTerlambat, setFormTerlambat] = useState('06:45');
  const [formExpiry, setFormExpiry] = useState(30);
  const formRadius = 100;

  useEffect(() => {
    const refresh = () => {
      setSessions(dataStore.getSessions());
      setActiveSession(dataStore.getActiveSession());
    };
    refresh();
    return dataStore.subscribe(refresh);
  }, []);

  const handleToggleStatus = (session: AttendanceSession) => {
    const nextStatus = session.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    dataStore.updateSession(session.id, { status: nextStatus });
    setSessions(dataStore.getSessions());
    setActiveSession(dataStore.getActiveSession());
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const settings = dataStore.getSettings();

    const created = dataStore.addSession({
      nama_sesi: formNama,
      tanggal: formTanggal,
      jam_mulai: formMulai,
      jam_selesai: formSelesai,
      batas_terlambat: formTerlambat,
      qr_expiry_seconds: Number(formExpiry),
      latitude_sekolah: settings.latitude,
      longitude_sekolah: settings.longitude,
      radius_meter: Number(formRadius),
      face_verification_enabled: false,
      status: 'ACTIVE',
    });

    setSessions(dataStore.getSessions());
    setActiveSession(dataStore.getActiveSession());
    setShowAddModal(false);
    alert(`Sesi "${created.nama_sesi}" berhasil dibuat dan diaktifkan!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
            Jadwal Sesi Absensi Kelas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Atur waktu masuk, batas keterlambatan, dan toleransi radius GPS sekolah
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Sesi Baru</span>
        </button>
      </div>

      {/* Active Session Status Card */}
      {activeSession ? (
        <div className="glass-card rounded-3xl p-6 border border-emerald-200/90 shadow-sm bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">SESI AKTIF SAAT INI</span>
                <h3 className="text-base font-extrabold text-slate-900 font-heading">{activeSession.nama_sesi}</h3>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                ● AKTIF
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-white border border-slate-200/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Jam Absensi</span>
              <span className="font-bold text-slate-800 font-mono text-xs sm:text-sm">
                {activeSession.jam_mulai} - {activeSession.jam_selesai} WIB
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-slate-200/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Batas Terlambat</span>
              <span className="font-bold text-amber-600 font-mono text-xs sm:text-sm">
                {activeSession.batas_terlambat} WIB
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-slate-200/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Radius GPS</span>
              <span className="font-bold text-blue-600 text-xs sm:text-sm">
                {activeSession.radius_meter} meter
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center">
              <a
                href="/admin/scan"
                className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs text-center shadow-xs transition-colors"
              >
                Buka Scanner Kelas
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-8 border border-slate-200 shadow-sm bg-white/95 text-center space-y-3">
          <Clock className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Tidak Ada Sesi Absensi yang Sedang Aktif</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Aktifkan salah satu sesi di bawah ini atau buat sesi baru untuk memulai sesi absensi kelas.
          </p>
        </div>
      )}

      {/* Session Management List */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4 bg-white/95">
        <h3 className="text-sm font-bold text-slate-900 font-heading">
          Daftar Sesi Absensi ({sessions.length})
        </h3>

        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-slate-900">{s.nama_sesi}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      s.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>Tanggal: {s.tanggal}</span>
                  <span>•</span>
                  <span>Jam: {s.jam_mulai} - {s.jam_selesai} WIB</span>
                  <span>•</span>
                  <span className="text-amber-600 font-semibold">Terlambat: &gt; {s.batas_terlambat} WIB</span>
                  <span>•</span>
                  <span className="text-blue-600 font-semibold">Radius: {s.radius_meter}m</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleToggleStatus(s)}
                  className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    s.status === 'ACTIVE'
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {s.status === 'ACTIVE' ? (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      <span>Tutup Sesi</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Buka & Aktifkan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Add Session */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 my-auto border border-slate-200 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Buat Sesi Absensi Baru
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Sesi</label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Absensi Pagi - XI PPLG 3"
                  className="w-full glass-input rounded-xl p-2.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full glass-input rounded-xl p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Batas Terlambat</label>
                  <input
                    type="time"
                    required
                    value={formTerlambat}
                    onChange={(e) => setFormTerlambat(e.target.value)}
                    className="w-full glass-input rounded-xl p-2.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={formMulai}
                    onChange={(e) => setFormMulai(e.target.value)}
                    className="w-full glass-input rounded-xl p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={formSelesai}
                    onChange={(e) => setFormSelesai(e.target.value)}
                    className="w-full glass-input rounded-xl p-2.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Durasi QR (Detik)</label>
                  <input
                    type="number"
                    min="15"
                    max="120"
                    required
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(Number(e.target.value))}
                    className="w-full glass-input rounded-xl p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Status Radius GPS</label>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-between">
                    <span className="truncate">Ikuti Posisi Siswa</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold shrink-0 ml-1">
                      Live Dynamic
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 transition-colors cursor-pointer text-xs active:scale-95"
                >
                  Buat & Aktifkan Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
