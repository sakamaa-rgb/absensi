import type { 
  Student, 
  AttendanceSession, 
  AttendanceRecord, 
  ActivityLog, 
  SystemSettings, 
  AttendanceStatus,
  ActivityAction
} from '../types/database';
import { INITIAL_SETTINGS, INITIAL_SESSION } from '../lib/mockData';
import { calculateHaversineDistance, type UserLocation } from '../lib/location';
import { safeStorage } from '../lib/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const STORAGE_KEYS = {
  STUDENTS: 'pplg3_students',
  SESSIONS: 'pplg3_sessions',
  ATTENDANCE: 'pplg3_attendance',
  LOGS: 'pplg3_activity_logs',
  SETTINGS: 'pplg3_settings',
  QR_TOKENS: 'pplg3_qr_tokens',
};

// Global unified Realtime channel name for Cross-Device Sync (Windows PC <-> Mobile HP)
const REALTIME_CHANNEL_NAME = 'pplg3_school_realtime_mesh';

export interface RealtimeMutationPayload {
  sourceDeviceId: string;
  timestamp: number;
  entity: 'STUDENTS' | 'ATTENDANCE' | 'SESSIONS' | 'SETTINGS' | 'LOGS' | 'FULL_SYNC';
  action: 'ADD' | 'UPDATE' | 'DELETE' | 'DELETE_ALL' | 'RESET_DEVICE' | 'SNAPSHOT';
  payload: any;
}

// Safe UUID generator compatible with modern browsers and standard environments
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper to safely execute Supabase PostgREST promises with detailed error logging
function safeCloud(builder: any): Promise<any> {
  if (builder && typeof builder.then === 'function') {
    return builder.then(
      (res: any) => {
        if (res && res.error) {
          console.error('[Supabase Cloud Error]', res.error.message || res.error);
        }
        return res;
      },
      (err: any) => {
        console.error('[Supabase Cloud Exception]', err);
      }
    );
  }
  return Promise.resolve();
}

class DataStore {
  private students: Student[];
  private sessions: AttendanceSession[];
  private attendance: AttendanceRecord[];
  private logs: ActivityLog[];
  private settings: SystemSettings;
  private currentQrToken: { token: string; expiresAt: number; sessionId: string } | null = null;
  private subscribers: Array<() => void> = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private isSupabaseSyncing = false;
  private deviceId: string;
  private isRealtimeConnected = false;
  private lastSyncTime: Date | null = null;

  constructor() {
    // Generate persistent unique device identifier for deduplication
    const savedDeviceId = typeof window !== 'undefined' ? safeStorage.getItem('pplg3_device_instance_id') : null;
    this.deviceId = savedDeviceId || ('dev_' + Math.random().toString(36).substring(2, 11));
    if (typeof window !== 'undefined' && !savedDeviceId) {
      safeStorage.setItem('pplg3_device_instance_id', this.deviceId);
    }

    const rawStored = this.loadFromStorage<Student[]>(STORAGE_KEYS.STUDENTS, []);
    const storedStudents = rawStored.filter(s => s.id !== 'std-1');
    this.students = storedStudents.map(s => {
      if (!s.foto_url) {
        const backupPhoto = safeStorage.getItem(`pplg3_foto_${s.id}`) || safeStorage.getItem(`pplg3_foto_nisn_${s.nisn}`);
        if (backupPhoto) return { ...s, foto_url: backupPhoto };
      }
      return s;
    });
    this.attendance = this.loadFromStorage(STORAGE_KEYS.ATTENDANCE, []);
    this.logs = this.loadFromStorage(STORAGE_KEYS.LOGS, []);

    this.sessions = this.loadFromStorage(STORAGE_KEYS.SESSIONS, [INITIAL_SESSION]);
    this.settings = this.loadFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);

    if (this.logs.length === 0) {
      this.addLog('LOGIN', 'Sistem Absensi XI PPLG 3 diinisialisasi (Data bersih)');
    }

    // 1. Cross-Tab & Cross-Window Instant Real-Time Sync (Same Device)
    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        try {
          this.broadcastChannel = new BroadcastChannel('pplg3_datastore_sync');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data?.type === 'SYNC') {
              this.reloadAllFromStorage();
              this.notifySubscribers();
            }
          };
        } catch {}
      }

      window.addEventListener('storage', (e) => {
        if (e.key && Object.values(STORAGE_KEYS).includes(e.key)) {
          this.reloadAllFromStorage();
          this.notifySubscribers();
        }
      });

      // Auto-catchup when window/tab is focused or network recovers
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void this.syncWithSupabase();
        }
      });
      window.addEventListener('online', () => {
        void this.syncWithSupabase();
      });
      window.addEventListener('focus', () => {
        void this.syncWithSupabase();
      });
    }

    // 2. Cross-Device Real-Time Sync via Supabase Global Channel (Windows PC <-> Mobile HP)
    if (isSupabaseConfigured && typeof window !== 'undefined') {
      this.setupSupabaseRealtime();
      void this.syncWithSupabase();
    }
  }

  private setupSupabaseRealtime() {
    try {
      this.realtimeChannel = supabase.channel(REALTIME_CHANNEL_NAME, {
        config: {
          broadcast: { self: false },
        },
      });

      // A. Listen to Cross-Device Broadcasts (Instant Peer-to-Peer Relay between PC and Mobile)
      this.realtimeChannel.on('broadcast', { event: 'PPLG3_MUTATION' }, ({ payload }) => {
        if (payload && payload.sourceDeviceId !== this.deviceId) {
          this.handleIncomingRealtimeMutation(payload as RealtimeMutationPayload);
        }
      });

      // B. Listen to Direct Database Postgres Changes (Supabase DB events)
      this.realtimeChannel.on('postgres_changes', { event: '*', schema: 'public' }, () => {
        void this.syncWithSupabase();
      });

      this.realtimeChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.isRealtimeConnected = true;
          this.lastSyncTime = new Date();
          this.notifySubscribers();
          console.log('[Supabase Realtime] Terkoneksi aktif pada kanal mesh:', REALTIME_CHANNEL_NAME);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          this.isRealtimeConnected = false;
          this.notifySubscribers();
        }
      });
    } catch (e) {
      console.warn('[dataStore] Supabase realtime channel setup notice:', e);
    }
  }

  /**
   * Broadcast a mutation event to all other connected devices (PC, Mobile, etc.)
   */
  private broadcastRealtimeMutation(mutation: Omit<RealtimeMutationPayload, 'sourceDeviceId' | 'timestamp'>) {
    if (!isSupabaseConfigured || !this.realtimeChannel) return;

    try {
      this.realtimeChannel.send({
        type: 'broadcast',
        event: 'PPLG3_MUTATION',
        payload: {
          ...mutation,
          sourceDeviceId: this.deviceId,
          timestamp: Date.now(),
        },
      });
    } catch (err) {
      console.warn('[Realtime Broadcast Send Warning]', err);
    }
  }

  /**
   * Handle incoming mutation from another device in real-time
   */
  private handleIncomingRealtimeMutation(mutation: RealtimeMutationPayload) {
    const { entity, action, payload } = mutation;
    let didChange = false;

    try {
      if (entity === 'STUDENTS') {
        if (action === 'ADD') {
          const exists = this.students.some(s => s.id === payload.id || s.nis === payload.nis);
          if (!exists) {
            this.students = [...this.students, payload].sort((a, b) => a.nomor_absen - b.nomor_absen);
            this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);
            didChange = true;
          }
        } else if (action === 'UPDATE') {
          const idx = this.students.findIndex(s => s.id === payload.id);
          if (idx !== -1) {
            this.students[idx] = { ...this.students[idx], ...payload.updates, updated_at: new Date().toISOString() };
            this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);
            didChange = true;
          }
        } else if (action === 'DELETE') {
          const targetId = payload.id;
          const initialLen = this.students.length;
          this.students = this.students.filter(s => s.id !== targetId);
          if (this.students.length !== initialLen) {
            this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);
            didChange = true;
          }
        } else if (action === 'SNAPSHOT') {
          if (Array.isArray(payload)) {
            this.students = payload;
            this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);
            didChange = true;
          }
        } else if (action === 'DELETE_ALL') {
          this.students = [];
          this.saveToStorage(STORAGE_KEYS.STUDENTS, []);
          didChange = true;
        } else if (action === 'RESET_DEVICE') {
          const idx = this.students.findIndex(s => s.id === payload.id);
          if (idx !== -1) {
            this.students[idx] = { ...this.students[idx], device_token: null, device_info: null };
            this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);
            didChange = true;
          }
        }
      } else if (entity === 'ATTENDANCE') {
        if (action === 'ADD') {
          const exists = this.attendance.some(a => a.id === payload.id);
          if (!exists) {
            this.attendance = [payload, ...this.attendance];
            this.saveToStorage(STORAGE_KEYS.ATTENDANCE, this.attendance);
            didChange = true;
          }
        } else if (action === 'UPDATE') {
          const idx = this.attendance.findIndex(
            a => a.id === payload.id || (a.student_id === payload.studentId && a.session_id === payload.sessionId)
          );
          if (idx !== -1) {
            this.attendance[idx] = {
              ...this.attendance[idx],
              status: payload.newStatus || payload.status,
              keterangan: payload.keterangan || this.attendance[idx].keterangan,
            };
            this.saveToStorage(STORAGE_KEYS.ATTENDANCE, this.attendance);
            didChange = true;
          }
        }
      } else if (entity === 'SESSIONS') {
        if (action === 'ADD') {
          const exists = this.sessions.some(s => s.id === payload.id);
          if (!exists) {
            this.sessions = [payload, ...this.sessions];
            this.saveToStorage(STORAGE_KEYS.SESSIONS, this.sessions);
            didChange = true;
          }
        } else if (action === 'UPDATE') {
          const idx = this.sessions.findIndex(s => s.id === payload.id);
          if (idx !== -1) {
            this.sessions[idx] = { ...this.sessions[idx], ...payload.updates };
            this.saveToStorage(STORAGE_KEYS.SESSIONS, this.sessions);
            didChange = true;
          }
        }
      } else if (entity === 'SETTINGS') {
        if (action === 'UPDATE') {
          this.settings = { ...this.settings, ...payload };
          this.saveToStorage(STORAGE_KEYS.SETTINGS, this.settings);
          didChange = true;
        }
      } else if (entity === 'LOGS') {
        if (action === 'ADD') {
          const exists = this.logs.some(l => l.id === payload.id);
          if (!exists) {
            this.logs = [payload, ...this.logs].slice(0, 100);
            this.saveToStorage(STORAGE_KEYS.LOGS, this.logs);
            didChange = true;
          }
        }
      }

      if (didChange) {
        this.lastSyncTime = new Date();
        this.notifySubscribers();
      }
    } catch (e) {
      console.warn('[dataStore] Error handling incoming mutation:', e);
    }
  }

  /**
   * Sync data between Supabase Cloud and local memory & storage
   * Bridges Windows PC and Mobile phone seamlessly!
   */
  public async syncWithSupabase(): Promise<void> {
    if (!isSupabaseConfigured || this.isSupabaseSyncing) return;
    this.isSupabaseSyncing = true;

    try {
      // 1. Fetch Students
      const { data: supaStudents, error: studentErr } = await supabase
        .from('students')
        .select('*')
        .order('nomor_absen', { ascending: true });

      if (!studentErr && supaStudents) {
        if (supaStudents.length === 0 && this.students.length > 0) {
          // Push initial local students to cloud if cloud is totally empty
          const pushPayload = this.students.map(localSt => {
            const uuid = (localSt.id && localSt.id.length === 36) ? localSt.id : generateUUID();
            localSt.id = uuid;
            return {
              id: uuid,
              nama: localSt.nama,
              nis: localSt.nis,
              nisn: localSt.nisn,
              nomor_absen: Number(localSt.nomor_absen) || 1,
              email: localSt.email,
              kelas: localSt.kelas || 'XI PPLG 3',
              status: localSt.status || 'active',
              foto_url: localSt.foto_url || null,
            };
          });
          await this.safeUpsertStudents(pushPayload);
          const { data: refreshedSupa } = await supabase
            .from('students')
            .select('*')
            .order('nomor_absen', { ascending: true });
            
          if (refreshedSupa) {
            this.updateLocalStudentsFromCloud(refreshedSupa);
          }
        } else {
          this.updateLocalStudentsFromCloud(supaStudents);
        }
      }

      // 2. Fetch Sessions
      const { data: supaSessions, error: sesErr } = await supabase
        .from('attendance_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!sesErr && supaSessions) {
        const supaSessionIds = new Set(supaSessions.map(s => s.id));
        const mappedSupa: AttendanceSession[] = supaSessions.map(ses => ({
          id: ses.id,
          nama_sesi: ses.nama_sesi,
          tanggal: ses.tanggal,
          jam_mulai: String(ses.jam_mulai).substring(0, 5),
          jam_selesai: String(ses.jam_selesai).substring(0, 5),
          batas_terlambat: String(ses.batas_terlambat).substring(0, 5),
          qr_expiry_seconds: Number(ses.qr_expiry_seconds) || 30,
          latitude_sekolah: Number(ses.latitude_sekolah) || -6.6025,
          longitude_sekolah: Number(ses.longitude_sekolah) || 106.7584,
          radius_meter: Number(ses.radius_meter) || 100,
          face_verification_enabled: Boolean(ses.face_verification_enabled),
          status: ses.status,
          created_at: ses.created_at,
        }));

        // Upload any local sessions that don't exist in Supabase yet so Mobile HP can read them
        const localUnsynced = this.sessions.filter(local => !supaSessionIds.has(local.id));
        if (localUnsynced.length > 0) {
          for (const ses of localUnsynced) {
            await safeCloud(
              supabase.from('attendance_sessions').upsert({
                id: ses.id,
                nama_sesi: ses.nama_sesi,
                tanggal: ses.tanggal,
                jam_mulai: ses.jam_mulai,
                jam_selesai: ses.jam_selesai,
                batas_terlambat: ses.batas_terlambat,
                qr_expiry_seconds: ses.qr_expiry_seconds,
                latitude_sekolah: ses.latitude_sekolah,
                longitude_sekolah: ses.longitude_sekolah,
                radius_meter: ses.radius_meter,
                face_verification_enabled: ses.face_verification_enabled,
                status: ses.status,
                created_at: ses.created_at || new Date().toISOString(),
              })
            );
          }
        }

        // Preserve all sessions that exist locally so nothing ever disappears!
        this.sessions = [...localUnsynced, ...mappedSupa];
        this.saveToStorage(STORAGE_KEYS.SESSIONS, this.sessions);
      }

      // 3. Fetch Attendance Records
      const { data: supaAtt, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .order('created_at', { ascending: false });

      if (!attErr && supaAtt) {
        const supaAttIds = new Set(supaAtt.map(a => a.id));
        const localUnsyncedAtt = this.attendance.filter(a => !supaAttIds.has(a.id));
        if (localUnsyncedAtt.length > 0) {
          for (const a of localUnsyncedAtt) {
            await safeCloud(
              supabase.from('attendance').upsert({
                id: a.id,
                student_id: a.student_id,
                session_id: a.session_id,
                tanggal: a.tanggal,
                waktu: a.waktu,
                status: a.status,
                latitude: a.latitude,
                longitude: a.longitude,
                accuracy: a.accuracy,
                distance: a.distance,
                device_token: a.device_token,
                face_verified: a.face_verified,
                attendance_code: a.attendance_code,
                keterangan: a.keterangan,
                created_at: a.created_at || new Date().toISOString(),
              })
            );
          }
        }

        const mappedSupa = supaAtt.map(a => ({
          id: a.id,
          student_id: a.student_id,
          session_id: a.session_id,
          tanggal: a.tanggal,
          waktu: a.waktu,
          status: a.status,
          latitude: a.latitude ? Number(a.latitude) : undefined,
          longitude: a.longitude ? Number(a.longitude) : undefined,
          accuracy: a.accuracy ? Number(a.accuracy) : undefined,
          distance: a.distance ? Number(a.distance) : undefined,
          device_token: a.device_token,
          face_verified: a.face_verified,
          attendance_code: a.attendance_code,
          keterangan: a.keterangan,
          created_at: a.created_at,
        }));

        this.attendance = [...localUnsyncedAtt, ...mappedSupa];
        this.saveToStorage(STORAGE_KEYS.ATTENDANCE, this.attendance);
      }

      // 4. Fetch System Settings from Supabase
      const { data: supaSettings, error: setErr } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'general_settings')
        .maybeSingle();

      if (!setErr && supaSettings && supaSettings.value) {
        this.settings = { ...this.settings, ...supaSettings.value };
        this.saveToStorage(STORAGE_KEYS.SETTINGS, this.settings);
      }

      this.isRealtimeConnected = true;
      this.lastSyncTime = new Date();
      this.notifySubscribers();
    } catch (e) {
      console.warn('[dataStore] Supabase sync caught:', e);
    } finally {
      this.isSupabaseSyncing = false;
    }
  }

  private updateLocalStudentsFromCloud(supaStudents: any[]) {
    if (!supaStudents || !Array.isArray(supaStudents)) return;

    const supaKeys = new Set(supaStudents.map(s => s.id));
    const supaNisns = new Set(supaStudents.map(s => s.nisn).filter(Boolean));
    const supaNises = new Set(supaStudents.map(s => s.nis).filter(Boolean));

    const mappedSupa: Student[] = supaStudents.map(s => {
      const backupPhoto = safeStorage.getItem(`pplg3_foto_${s.id}`) || safeStorage.getItem(`pplg3_foto_nisn_${s.nisn}`);
      return {
        id: s.id,
        user_id: s.user_id,
        nis: s.nis,
        nisn: s.nisn,
        nomor_absen: Number(s.nomor_absen) || 1,
        nama: s.nama,
        kelas: s.kelas || 'XI PPLG 3',
        email: s.email,
        foto_url: s.foto_url || backupPhoto || null,
        device_token: s.device_token,
        device_info: s.device_info,
        status: s.status || 'active',
        created_at: s.created_at,
        updated_at: s.updated_at,
      };
    });

    // IMPORTANT: Keep all locally added / imported students so they NEVER get deleted by cloud sync!
    const localUnsynced = this.students.filter(local => 
      !supaKeys.has(local.id) && 
      (!local.nisn || !supaNisns.has(local.nisn)) &&
      (!local.nis || !supaNises.has(local.nis))
    );

    // Auto-push unsynced local students to Supabase in background
    if (localUnsynced.length > 0 && isSupabaseConfigured) {
      const pushPayload = localUnsynced.map(st => ({
        id: st.id,
        nama: st.nama,
        nis: st.nis,
        nisn: st.nisn,
        nomor_absen: st.nomor_absen,
        email: st.email,
        kelas: st.kelas,
        status: st.status,
        foto_url: st.foto_url || null,
        created_at: st.created_at,
      }));
      void this.safeUpsertStudents(pushPayload);
    }

    this.students = [...mappedSupa, ...localUnsynced].sort((a, b) => a.nomor_absen - b.nomor_absen);
    this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);
  }

  /**
   * Resilient student upsert to Supabase: automatically retries without optional columns (e.g. foto_url)
   * if the Postgres table schema doesn't have them yet.
   */
  private async safeUpsertStudents(studentsPayload: any[]): Promise<{ error: any }> {
    if (!isSupabaseConfigured || !studentsPayload || studentsPayload.length === 0) {
      return { error: null };
    }

    const { error } = await supabase.from('students').upsert(studentsPayload, { onConflict: 'nisn' });
    if (!error) return { error: null };

    // Fallback: if database schema doesn't have 'foto_url' column yet, retry omitting it so sync always succeeds
    if (error && error.message && (error.message.includes('foto_url') || error.message.includes('column'))) {
      const cleanPayload = studentsPayload.map(({ foto_url: _foto_url, ...rest }) => rest);
      const retry = await supabase.from('students').upsert(cleanPayload, { onConflict: 'nisn' });
      return { error: retry.error };
    }

    return { error };
  }

  public async pushAllLocalDataToSupabase(): Promise<{
    success: boolean;
    error?: string;
    studentsPushed: number;
    sessionsPushed: number;
  }> {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase belum terkonfigurasi di file .env', studentsPushed: 0, sessionsPushed: 0 };
    }

    try {
      // 1. Push students
      let studentsPushed = 0;
      if (this.students.length > 0) {
        const payload = this.students.map(st => {
          const id = (st.id && st.id.length === 36) ? st.id : generateUUID();
          st.id = id;
          return {
            id,
            nama: st.nama,
            nis: st.nis,
            nisn: st.nisn,
            nomor_absen: Number(st.nomor_absen) || 1,
            email: st.email,
            kelas: st.kelas || 'XI PPLG 3',
            status: st.status || 'active',
            foto_url: st.foto_url || null,
            created_at: st.created_at || new Date().toISOString(),
          };
        });

        const { error: stErr } = await this.safeUpsertStudents(payload);
        if (stErr) {
          return { success: false, error: `Gagal upload ke tabel students: ${stErr.message}`, studentsPushed: 0, sessionsPushed: 0 };
        }
        studentsPushed = payload.length;
        this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);
      }

      // 2. Push sessions
      let sessionsPushed = 0;
      if (this.sessions.length > 0) {
        const sesPayload = this.sessions.map(s => {
          const id = (s.id && s.id.length === 36) ? s.id : generateUUID();
          s.id = id;
          return {
            id,
            nama_sesi: s.nama_sesi,
            tanggal: s.tanggal,
            jam_mulai: s.jam_mulai,
            jam_selesai: s.jam_selesai,
            batas_terlambat: s.batas_terlambat,
            qr_expiry_seconds: s.qr_expiry_seconds,
            latitude_sekolah: s.latitude_sekolah,
            longitude_sekolah: s.longitude_sekolah,
            radius_meter: s.radius_meter,
            face_verification_enabled: s.face_verification_enabled,
            status: s.status,
            created_at: s.created_at || new Date().toISOString(),
          };
        });
        const { error: sesErr } = await supabase.from('attendance_sessions').upsert(sesPayload);
        if (sesErr) {
          return { success: false, error: `Gagal upload ke tabel attendance_sessions: ${sesErr.message}`, studentsPushed, sessionsPushed: 0 };
        }
        sessionsPushed = sesPayload.length;
        this.saveToStorage(STORAGE_KEYS.SESSIONS, this.sessions);
      }

      // Broadcast snapshot to Mobile immediately
      this.broadcastRealtimeMutation({
        entity: 'STUDENTS',
        action: 'SNAPSHOT',
        payload: this.students,
      });

      return { success: true, studentsPushed, sessionsPushed };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e), studentsPushed: 0, sessionsPushed: 0 };
    }
  }

  public reloadAllFromStorage(): void {
    const loaded = this.loadFromStorage<Student[]>(STORAGE_KEYS.STUDENTS, []);
    this.students = loaded.map(s => {
      if (!s.foto_url) {
        const backupPhoto = safeStorage.getItem(`pplg3_foto_${s.id}`) || safeStorage.getItem(`pplg3_foto_nisn_${s.nisn}`);
        if (backupPhoto) return { ...s, foto_url: backupPhoto };
      }
      return s;
    });
    this.attendance = this.loadFromStorage<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
    this.logs = this.loadFromStorage<ActivityLog[]>(STORAGE_KEYS.LOGS, []);
    this.sessions = this.loadFromStorage<AttendanceSession[]>(STORAGE_KEYS.SESSIONS, [INITIAL_SESSION]);
    this.settings = this.loadFromStorage<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  public clearAllData(): void {
    this.students = [];
    this.attendance = [];
    this.logs = [];
    this.saveToStorage(STORAGE_KEYS.STUDENTS, []);
    this.saveToStorage(STORAGE_KEYS.ATTENDANCE, []);
    this.saveToStorage(STORAGE_KEYS.LOGS, []);
    this.addLog('LOGIN', 'Semua data absensi dan siswa dibersihkan oleh Admin');

    this.broadcastRealtimeMutation({
      entity: 'STUDENTS',
      action: 'DELETE_ALL',
      payload: null,
    });

    if (isSupabaseConfigured) {
      safeCloud(supabase.from('students').delete().neq('nama', '__dummy_all_students__'));
      safeCloud(supabase.from('attendance').delete().neq('status', '__dummy_status__'));
    }
  }

  private loadFromStorage<T>(key: string, defaultValue: T): T {
    try {
      const stored = safeStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private saveToStorage(key: string, data: any) {
    try {
      safeStorage.setItem(key, JSON.stringify(data));
      this.notifySubscribers();
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({ type: 'SYNC', key, timestamp: Date.now() });
        } catch {}
      }
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }

  public subscribe(callback: () => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(cb => cb());
  }

  public getRealtimeStatus(): { isConnected: boolean; channelName: string; lastSyncTime: Date | null } {
    return {
      isConnected: this.isRealtimeConnected,
      channelName: REALTIME_CHANNEL_NAME,
      lastSyncTime: this.lastSyncTime,
    };
  }

  public async forceCloudSync(): Promise<void> {
    await this.syncWithSupabase();
  }

  // ==================== LOGS ====================
  public addLog(action: ActivityAction, description: string, user_id?: string, device_info?: any) {
    const newLog: ActivityLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      user_id,
      action,
      description,
      device_info,
      created_at: new Date().toISOString(),
    };
    this.logs = [newLog, ...this.logs].slice(0, 100);
    this.saveToStorage(STORAGE_KEYS.LOGS, this.logs);

    this.broadcastRealtimeMutation({
      entity: 'LOGS',
      action: 'ADD',
      payload: newLog,
    });

    if (isSupabaseConfigured) {
      safeCloud(
        supabase.from('activity_logs').insert({
          action,
          description,
          device_info: device_info || null,
          created_at: newLog.created_at,
        })
      );
    }
  }

  public getLogs(): ActivityLog[] {
    return this.logs;
  }

  // ==================== STUDENTS ====================
  public getStudents(): Student[] {
    return this.students;
  }

  public getStudentById(id: string): Student | undefined {
    const student = this.students.find(s => s.id === id);
    if (student && !student.foto_url) {
      const backupPhoto = safeStorage.getItem(`pplg3_foto_${student.id}`) || safeStorage.getItem(`pplg3_foto_nisn_${student.nisn}`);
      if (backupPhoto) {
        student.foto_url = backupPhoto;
      }
    }
    return student;
  }

  public getStudentByEmail(email: string): Student | undefined {
    const student = this.students.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (student && !student.foto_url) {
      const backupPhoto = safeStorage.getItem(`pplg3_foto_${student.id}`) || safeStorage.getItem(`pplg3_foto_nisn_${student.nisn}`);
      if (backupPhoto) {
        student.foto_url = backupPhoto;
      }
    }
    return student;
  }

  public getStudentByNis(nis: string): Student | undefined {
    return this.students.find(s => s.nis === nis);
  }

  public getStudentByNisn(nisn: string): Student | undefined {
    return this.students.find(s => s.nisn === nisn);
  }

  public updateStudent(id: string, updates: Partial<Student>): boolean {
    let idx = this.students.findIndex(s => s.id === id);
    if (idx === -1) {
      idx = this.students.findIndex(s => 
        (s.nisn && s.nisn === id) || 
        (s.nis && s.nis === id) || 
        (s.email && s.email.toLowerCase() === id.toLowerCase()) || 
        (s.user_id && s.user_id === id)
      );
    }

    if (idx !== -1) {
      this.students[idx] = { ...this.students[idx], ...updates, updated_at: new Date().toISOString() };
    } else {
      const newStudent: Student = {
        id,
        nis: updates.nis || '',
        nisn: updates.nisn || '',
        nomor_absen: updates.nomor_absen || 1,
        nama: updates.nama || 'Siswa',
        kelas: updates.kelas || 'XI PPLG 3',
        email: updates.email || '',
        status: 'active',
        ...updates,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.students.push(newStudent);
      idx = this.students.length - 1;
    }

    const targetStudent = this.students[idx];

    // Backup photo to dedicated storage keys
    if (updates.foto_url !== undefined) {
      if (updates.foto_url) {
        safeStorage.setItem(`pplg3_foto_${id}`, updates.foto_url);
        if (targetStudent?.id && targetStudent.id !== id) {
          safeStorage.setItem(`pplg3_foto_${targetStudent.id}`, updates.foto_url);
        }
        if (targetStudent?.nisn) {
          safeStorage.setItem(`pplg3_foto_nisn_${targetStudent.nisn}`, updates.foto_url);
        }
      } else {
        safeStorage.removeItem(`pplg3_foto_${id}`);
        if (targetStudent?.id) {
          safeStorage.removeItem(`pplg3_foto_${targetStudent.id}`);
        }
        if (targetStudent?.nisn) {
          safeStorage.removeItem(`pplg3_foto_nisn_${targetStudent.nisn}`);
        }
      }
    }

    this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);

    // Instant Cross-Device Broadcast to PC & Mobile
    this.broadcastRealtimeMutation({
      entity: 'STUDENTS',
      action: 'UPDATE',
      payload: { id, updates },
    });

    // Sync update to Supabase Cloud
    if (isSupabaseConfigured) {
      const supaUpdates: any = { ...updates, updated_at: new Date().toISOString() };
      delete supaUpdates.id;

      if (id.length === 36) {
        safeCloud(supabase.from('students').update(supaUpdates).eq('id', id));
      } else if (targetStudent) {
        safeCloud(supabase.from('students').update(supaUpdates).or(`nisn.eq.${targetStudent.nisn},email.eq.${targetStudent.email}`));
      }
    }

    return true;
  }

  public resetStudentDevice(studentId: string): boolean {
    const student = this.getStudentById(studentId);
    if (!student) return false;
    this.updateStudent(studentId, { device_token: null, device_info: null });
    this.addLog('RESET_DEVICE', `Admin mereset binding device untuk siswa: ${student.nama} (Absen: ${student.nomor_absen})`);

    this.broadcastRealtimeMutation({
      entity: 'STUDENTS',
      action: 'RESET_DEVICE',
      payload: { id: studentId },
    });

    return true;
  }

  public addStudent(studentData: Omit<Student, 'id'>): Student {
    const uuid = generateUUID();
    const newStudent: Student = {
      ...studentData,
      id: uuid,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    this.students = [...this.students, newStudent].sort((a, b) => a.nomor_absen - b.nomor_absen);
    this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);
    this.addLog('LOGIN', `Admin menambahkan siswa baru: ${newStudent.nama}`);

    // Instant Cross-Device Broadcast to PC & Mobile
    this.broadcastRealtimeMutation({
      entity: 'STUDENTS',
      action: 'ADD',
      payload: newStudent,
    });

    // Sync insertion to Supabase Cloud
    if (isSupabaseConfigured) {
      safeCloud(
        supabase.from('students').upsert({
          id: uuid,
          nama: newStudent.nama,
          nis: newStudent.nis,
          nisn: newStudent.nisn,
          nomor_absen: newStudent.nomor_absen,
          email: newStudent.email,
          kelas: newStudent.kelas,
          status: newStudent.status,
          foto_url: newStudent.foto_url || null,
          created_at: newStudent.created_at,
        }, { onConflict: 'nisn' })
      );
    }

    return newStudent;
  }

  public importStudents(newStudentsData: Array<Omit<Student, 'id'>>): Student[] {
    const added: Student[] = [];

    for (const data of newStudentsData) {
      const existingIdx = this.students.findIndex(s => 
        (data.nisn && s.nisn === data.nisn) || 
        (data.nis && s.nis === data.nis) ||
        (data.email && s.email.toLowerCase() === data.email.toLowerCase())
      );

      if (existingIdx !== -1) {
        this.students[existingIdx] = {
          ...this.students[existingIdx],
          ...data,
          updated_at: new Date().toISOString()
        };
        added.push(this.students[existingIdx]);
      } else {
        const uuid = generateUUID();
        const newSt: Student = {
          ...data,
          id: uuid,
          status: 'active',
          created_at: new Date().toISOString(),
        };
        this.students.push(newSt);
        added.push(newSt);
      }
    }

    this.students.sort((a, b) => a.nomor_absen - b.nomor_absen);
    this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);
    this.addLog('LOGIN', `Admin mengimport ${added.length} data siswa dari file Excel`);

    // Broadcast snapshot update to all devices
    this.broadcastRealtimeMutation({
      entity: 'STUDENTS',
      action: 'SNAPSHOT',
      payload: this.students,
    });

    // Batch upsert to Supabase
    if (isSupabaseConfigured && added.length > 0) {
      const supaPayload = added.map(st => ({
        id: st.id,
        nama: st.nama,
        nis: st.nis,
        nisn: st.nisn,
        nomor_absen: st.nomor_absen,
        email: st.email,
        kelas: st.kelas,
        status: st.status,
        foto_url: st.foto_url || null,
        created_at: st.created_at,
      }));

      void this.safeUpsertStudents(supaPayload);
    }

    return added;
  }

  public deleteStudent(id: string): boolean {
    const student = this.getStudentById(id);
    if (!student) return false;
    this.students = this.students.filter(s => s.id !== id);
    this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);

    // Cascade delete attendance and photo cache for this student
    this.attendance = this.attendance.filter(a => a.student_id !== id);
    this.saveToStorage(STORAGE_KEYS.ATTENDANCE, this.attendance);
    safeStorage.removeItem(`pplg3_foto_${id}`);
    if (student.nisn) safeStorage.removeItem(`pplg3_foto_nisn_${student.nisn}`);

    this.addLog('LOGIN', `Admin menghapus data siswa: ${student.nama} (Absen: ${student.nomor_absen})`);

    // Instant Cross-Device Broadcast to PC & Mobile
    this.broadcastRealtimeMutation({
      entity: 'STUDENTS',
      action: 'DELETE',
      payload: { id },
    });

    // Sync deletion to Supabase Cloud (cascade deletes attendance automatically in Postgres)
    if (isSupabaseConfigured) {
      if (id.length === 36) {
        safeCloud(supabase.from('students').delete().eq('id', id));
      } else {
        safeCloud(supabase.from('students').delete().or(`nisn.eq.${student.nisn},email.eq.${student.email}`));
      }
    }

    return true;
  }

  public deleteAllStudents(): number {
    const count = this.students.length;
    this.students = [];
    this.attendance = [];
    this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);
    this.saveToStorage(STORAGE_KEYS.ATTENDANCE, this.attendance);
    this.addLog('LOGIN', `Admin menghapus semua data siswa (${count} siswa)`);

    // Instant Cross-Device Broadcast to PC & Mobile
    this.broadcastRealtimeMutation({
      entity: 'STUDENTS',
      action: 'DELETE_ALL',
      payload: null,
    });

    if (isSupabaseConfigured) {
      safeCloud(supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
      safeCloud(supabase.from('students').delete().neq('nama', '__dummy_all_students_marker__'));
    }

    return count;
  }

  // ==================== SESSIONS ====================
  public getSessions(): AttendanceSession[] {
    return this.sessions;
  }

  public getActiveSession(): AttendanceSession | undefined {
    return this.sessions.find(s => s.status === 'ACTIVE');
  }

  public createSession(sessionData: Omit<AttendanceSession, 'id' | 'created_at'>): AttendanceSession {
    const uuid = generateUUID();
    const newSession: AttendanceSession = {
      ...sessionData,
      id: uuid,
      created_at: new Date().toISOString(),
    };

    // If new session is set to ACTIVE, set previous active sessions to CLOSED
    if (newSession.status === 'ACTIVE') {
      this.sessions = this.sessions.map(s => s.status === 'ACTIVE' ? { ...s, status: 'CLOSED' as const } : s);
    }

    this.sessions = [newSession, ...this.sessions];
    this.saveToStorage(STORAGE_KEYS.SESSIONS, this.sessions);

    // Instant Cross-Device Broadcast to PC & Mobile
    this.broadcastRealtimeMutation({
      entity: 'SESSIONS',
      action: 'ADD',
      payload: newSession,
    });

    if (isSupabaseConfigured) {
      if (newSession.status === 'ACTIVE') {
        safeCloud(supabase.from('attendance_sessions').update({ status: 'CLOSED' }).eq('status', 'ACTIVE'));
      }

      safeCloud(
        supabase.from('attendance_sessions').upsert({
          id: uuid,
          nama_sesi: newSession.nama_sesi,
          tanggal: newSession.tanggal || new Date().toISOString().split('T')[0],
          jam_mulai: newSession.jam_mulai.length === 5 ? `${newSession.jam_mulai}:00` : newSession.jam_mulai,
          jam_selesai: newSession.jam_selesai.length === 5 ? `${newSession.jam_selesai}:00` : newSession.jam_selesai,
          batas_terlambat: newSession.batas_terlambat.length === 5 ? `${newSession.batas_terlambat}:00` : newSession.batas_terlambat,
          qr_expiry_seconds: Number(newSession.qr_expiry_seconds) || 30,
          latitude_sekolah: Number(newSession.latitude_sekolah || this.settings.latitude || -6.6025000),
          longitude_sekolah: Number(newSession.longitude_sekolah || this.settings.longitude || 106.7584000),
          radius_meter: Number(newSession.radius_meter) || 100,
          face_verification_enabled: Boolean(newSession.face_verification_enabled),
          status: newSession.status,
          created_at: newSession.created_at,
        })
      );
    }

    return newSession;
  }

  // Alias for compatibility
  public addSession(sessionData: Omit<AttendanceSession, 'id' | 'created_at'>): AttendanceSession {
    return this.createSession(sessionData);
  }

  public updateSession(id: string, updates: Partial<AttendanceSession>): boolean {
    const idx = this.sessions.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.sessions[idx] = { ...this.sessions[idx], ...updates };
    this.saveToStorage(STORAGE_KEYS.SESSIONS, this.sessions);

    // Instant Cross-Device Broadcast to PC & Mobile
    this.broadcastRealtimeMutation({
      entity: 'SESSIONS',
      action: 'UPDATE',
      payload: { id, updates },
    });

    if (isSupabaseConfigured && id.length === 36) {
      safeCloud(supabase.from('attendance_sessions').update(updates).eq('id', id));
    }

    return true;
  }

  // ==================== DYNAMIC QR SYSTEM ====================
  public getOrGenerateDynamicQr(sessionId: string, durationSeconds = 30): { token: string; expiresAt: number; remainingSeconds: number } {
    const now = Date.now();
    if (
      this.currentQrToken &&
      this.currentQrToken.sessionId === sessionId &&
      this.currentQrToken.expiresAt > now
    ) {
      const remainingSeconds = Math.max(0, Math.ceil((this.currentQrToken.expiresAt - now) / 1000));
      return {
        token: this.currentQrToken.token,
        expiresAt: this.currentQrToken.expiresAt,
        remainingSeconds,
      };
    }

    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const token = `QR-${sessionId.substring(0, 6)}-${randomHex}`;
    const expiresAt = now + durationSeconds * 1000;

    this.currentQrToken = { token, expiresAt, sessionId };
    return {
      token,
      expiresAt,
      remainingSeconds: durationSeconds,
    };
  }

  // ==================== ATTENDANCE RECORDING ====================
  public getAttendance(): AttendanceRecord[] {
    return this.attendance.map(att => ({
      ...att,
      student: this.getStudentById(att.student_id),
      session: this.sessions.find(s => s.id === att.session_id),
    }));
  }

  public getAttendanceByStudent(studentId: string): AttendanceRecord[] {
    return this.getAttendance().filter(a => a.student_id === studentId);
  }

  public getAttendanceByIdOrCode(codeOrId: string): AttendanceRecord | undefined {
    return this.getAttendance().find(a => a.id === codeOrId || a.attendance_code === codeOrId);
  }

  public isAlreadyAttended(studentId: string, sessionId: string): boolean {
    return this.attendance.some(a => a.student_id === studentId && a.session_id === sessionId);
  }

  /**
   * Submit attendance directly from Student Scan with all 7 security layers
   */
  public submitStudentAttendance(params: {
    scannedToken: string;
    studentId: string;
    location: UserLocation;
    deviceToken: string;
    deviceInfo: any;
    faceVerified: boolean;
  }): { success: boolean; error?: string; message: string; record?: AttendanceRecord } {
    const { scannedToken, studentId, location, deviceToken, deviceInfo, faceVerified } = params;
    const student = this.getStudentById(studentId);
    if (!student) {
      return { success: false, error: 'STUDENT_NOT_FOUND', message: 'Siswa tidak ditemukan.' };
    }

    const now = Date.now();
    if (!this.currentQrToken || this.currentQrToken.token !== scannedToken) {
      this.addLog('QR_EXPIRED', `Scan QR gagal (Invalid Token) oleh ${student.nama}`, student.user_id || undefined, deviceInfo);
      return {
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Kode QR tidak valid atau telah kedaluwarsa. Silakan scan QR code proyektor terbaru.',
      };
    }

    if (this.currentQrToken.expiresAt < now) {
      this.addLog('QR_EXPIRED', `Scan QR gagal (Expired) oleh ${student.nama}`, student.user_id || undefined, deviceInfo);
      return {
        success: false,
        error: 'QR_EXPIRED',
        message: 'Kode QR telah kedaluwarsa. Tunggu kode QR baru muncul di proyektor kelas.',
      };
    }

    const session = this.getActiveSession();
    if (!session || session.id !== this.currentQrToken.sessionId) {
      return {
        success: false,
        error: 'NO_ACTIVE_SESSION',
        message: 'Tidak ada sesi absensi yang aktif saat ini.',
      };
    }

    if (this.isAlreadyAttended(studentId, session.id)) {
      return {
        success: false,
        error: 'ALREADY_ATTENDED',
        message: 'Kamu sudah melakukan absensi untuk sesi ini.',
      };
    }

    if (student.device_token && student.device_token !== deviceToken) {
      this.addLog('DEVICE_REJECTED', `Percobaan absensi dari perangkat berbeda oleh ${student.nama}`, student.user_id || undefined, deviceInfo);
      return {
        success: false,
        error: 'DEVICE_MISMATCH',
        message: 'Perangkat tidak sesuai. Akun kamu terikat dengan perangkat lain. Hubungi Admin / Ketua Kelas untuk reset binding HP.',
      };
    }

    if (!student.device_token) {
      this.updateStudent(studentId, {
        device_token: deviceToken,
        device_info: deviceInfo,
      });
      this.addLog('LOGIN', `Perangkat berhasil di-binding ke siswa: ${student.nama}`, student.user_id || undefined, deviceInfo);
    }

    const distance = calculateHaversineDistance(
      location.latitude,
      location.longitude,
      session.latitude_sekolah,
      session.longitude_sekolah
    );

    const locationNote = `Lokasi Siswa: [${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}] • Jarak: ${Math.round(distance)}m dari titik sekolah`;

    if (session.face_verification_enabled && !faceVerified) {
      this.addLog('FACE_FAILED', `Verifikasi wajah gagal oleh ${student.nama}`);
      return {
        success: false,
        error: 'FACE_FAILED',
        message: 'Wajah tidak berhasil diverifikasi. Silakan coba lagi.',
      };
    }

    const currentTimeStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());

    const isLate = currentTimeStr.substring(0, 5) > session.batas_terlambat;
    const finalStatus: AttendanceStatus = isLate ? 'TERLAMBAT' : 'HADIR';

    const attendanceCode = `ATT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const uuid = generateUUID();
    const newRecord: AttendanceRecord = {
      id: uuid,
      student_id: studentId,
      session_id: session.id,
      tanggal: new Date().toISOString().split('T')[0],
      waktu: currentTimeStr,
      status: finalStatus,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      distance,
      device_token: deviceToken,
      face_verified: faceVerified,
      attendance_code: attendanceCode,
      keterangan: isLate 
        ? `Terlambat • ${locationNote}` 
        : `Tepat waktu • ${locationNote}`,
      created_at: new Date().toISOString(),
    };

    this.attendance = [newRecord, ...this.attendance];
    this.saveToStorage(STORAGE_KEYS.ATTENDANCE, this.attendance);

    this.addLog(
      'ATTENDANCE_SUCCESS',
      `Absensi berhasil: ${student.nama} (${finalStatus}) - Jarak: ${distance}m`,
      student.user_id || undefined,
      deviceInfo
    );

    // Instant Cross-Device Broadcast to PC & Mobile
    this.broadcastRealtimeMutation({
      entity: 'ATTENDANCE',
      action: 'ADD',
      payload: newRecord,
    });

    // Sync to Supabase Cloud
    if (isSupabaseConfigured) {
      safeCloud(
        supabase.from('attendance').insert({
          id: uuid,
          student_id: studentId.length === 36 ? studentId : undefined,
          session_id: session.id.length === 36 ? session.id : undefined,
          tanggal: newRecord.tanggal,
          waktu: newRecord.waktu,
          status: newRecord.status,
          latitude: newRecord.latitude,
          longitude: newRecord.longitude,
          accuracy: newRecord.accuracy,
          distance: newRecord.distance,
          device_token: newRecord.device_token,
          face_verified: newRecord.face_verified,
          attendance_code: newRecord.attendance_code,
          keterangan: newRecord.keterangan,
          created_at: newRecord.created_at,
        })
      );
    }

    return {
      success: true,
      message: `Presensi berhasil dicatat sebagai ${finalStatus}!`,
      record: {
        ...newRecord,
        student,
        session,
      },
    };
  }

  /**
   * Scan Student QR directly from Admin Scanner
   */
  public scanStudentAndRecordAttendance(
    rawScanPayload: string,
    forcedStatus?: AttendanceStatus,
    customCoords?: { latitude: number; longitude: number; distance?: number; accuracy?: number }
  ): { success: boolean; isSuspicious?: boolean; message: string; student?: Student; record?: AttendanceRecord } {
    let cleanKey = rawScanPayload.trim();
    let dynamicCoords: { latitude: number; longitude: number; accuracy: number } | null = null;

    if (cleanKey.startsWith('{') && cleanKey.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanKey);
        cleanKey = parsed.nis || parsed.nisn || parsed.id || parsed.studentId || cleanKey;

        if (parsed.time || parsed.timestamp || parsed.t) {
          const qrTime = Number(parsed.t || parsed.time || parsed.timestamp);
          const ageSeconds = (Date.now() - qrTime) / 1000;
          if (ageSeconds > 120) {
            return {
              success: false,
              isSuspicious: true,
              message: `⚠️ QR KADALUARSA (${Math.round(ageSeconds)} detik lalu)! Terdeteksi screenshot atau QR simpanan. Siswa wajib membuka aplikasi langsung di HP-nya!`,
            };
          }
        }

        if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          dynamicCoords = {
            latitude: Number(parsed.lat.toFixed(7)),
            longitude: Number(parsed.lng.toFixed(7)),
            accuracy: parsed.accuracy ? Number(parsed.accuracy) : 5,
          };
        }
      } catch {}
    }

    const student = this.students.find(
      s => s.id === cleanKey || s.nis === cleanKey || s.nisn === cleanKey || s.email.toLowerCase() === cleanKey.toLowerCase()
    );
    if (!student) {
      return { success: false, message: 'Data siswa tidak ditemukan dari kode QR.' };
    }

    const session = this.getActiveSession();
    if (!session) {
      return { success: false, message: 'Tidak ada sesi absensi yang aktif saat ini.' };
    }

    if (this.isAlreadyAttended(student.id, session.id)) {
      const existing = this.attendance.find(a => a.student_id === student.id && a.session_id === session.id);
      return { 
        success: false, 
        message: `Siswa ${student.nama} (#${student.nomor_absen}) sudah tercatat ${existing?.status || 'HADIR'} pukul ${existing?.waktu || '-'} WIB!`,
        student,
        record: existing
      };
    }

    const currentTimeStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());

    const isLate = currentTimeStr.substring(0, 5) > (session.batas_terlambat || '06:45');
    const finalStatus: AttendanceStatus = forcedStatus 
      ? forcedStatus 
      : (isLate ? 'TERLAMBAT' : 'HADIR');

    const schoolLat = session.latitude_sekolah || this.settings.latitude || -6.6025000;
    const schoolLng = session.longitude_sekolah || this.settings.longitude || 106.7580556;

    const lat = dynamicCoords?.latitude ?? customCoords?.latitude ?? schoolLat;
    const lng = dynamicCoords?.longitude ?? customCoords?.longitude ?? schoolLng;
    const dist = dynamicCoords 
      ? calculateHaversineDistance(lat, lng, schoolLat, schoolLng)
      : (customCoords?.distance ?? 0);
    const accuracy = dynamicCoords?.accuracy ?? customCoords?.accuracy ?? 5;

    const locationNote = dynamicCoords 
      ? `Koordinat Siswa: [${lat.toFixed(5)}, ${lng.toFixed(5)}] • Jarak: ${Math.round(dist)}m dari titik sekolah`
      : 'Koordinat lokasi tercatat';

    const attendanceCode = `ADMIN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const uuid = generateUUID();
    const newRecord: AttendanceRecord = {
      id: uuid,
      student_id: student.id,
      session_id: session.id,
      tanggal: new Date().toISOString().split('T')[0],
      waktu: currentTimeStr,
      status: finalStatus,
      latitude: lat,
      longitude: lng,
      distance: dist,
      accuracy: accuracy,
      device_token: dynamicCoords ? 'STUDENT-LIVE-GPS' : 'ADMIN-DIRECT-SCAN',
      face_verified: false,
      attendance_code: attendanceCode,
      keterangan: isLate 
        ? `Terlambat • ${locationNote}` 
        : `Tepat waktu • ${locationNote}`,
      verified_by_admin: 'admin-ketua-kelas',
      created_at: new Date().toISOString(),
    };

    this.attendance = [newRecord, ...this.attendance];
    this.saveToStorage(STORAGE_KEYS.ATTENDANCE, this.attendance);

    this.addLog('ADMIN_SCAN_ATTENDANCE', `Admin / Ketua Kelas scan siswa: ${student.nama} (#${student.nomor_absen}) - Status: ${finalStatus} - Lokasi: ${dist}m`);

    // Instant Cross-Device Broadcast to PC & Mobile
    this.broadcastRealtimeMutation({
      entity: 'ATTENDANCE',
      action: 'ADD',
      payload: newRecord,
    });

    if (isSupabaseConfigured) {
      const validSessionId = session.id.length === 36 ? session.id : 'd8a7c39a-8bd1-4fad-a72f-b2ccdca03b58';
      const validStudentId = student.id.length === 36 ? student.id : (this.getStudentByNis(student.nis)?.id || student.id);

      safeCloud(
        supabase.from('attendance').upsert({
          id: uuid,
          student_id: validStudentId,
          session_id: validSessionId,
          tanggal: newRecord.tanggal,
          waktu: newRecord.waktu,
          status: newRecord.status,
          latitude: newRecord.latitude,
          longitude: newRecord.longitude,
          accuracy: newRecord.accuracy,
          distance: newRecord.distance,
          device_token: newRecord.device_token,
          attendance_code: newRecord.attendance_code,
          keterangan: newRecord.keterangan,
          created_at: newRecord.created_at,
        })
      );
    }

    return {
      success: true,
      message: `Berhasil mengabsenkan ${student.nama} (#${student.nomor_absen}) sebagai ${finalStatus}!`,
      student,
      record: {
        ...newRecord,
        student,
        session,
      },
    };
  }

  // Alias for compatibility with AdminScanStudent.tsx
  public adminScanStudent(
    rawScanPayload: string,
    forcedStatus?: AttendanceStatus,
    customCoords?: { latitude: number; longitude: number; distance?: number; accuracy?: number }
  ) {
    return this.scanStudentAndRecordAttendance(rawScanPayload, forcedStatus, customCoords);
  }

  public adminUpdateAttendanceStatus(
    studentId: string, 
    sessionId: string, 
    newStatus: AttendanceStatus, 
    keterangan?: string
  ): boolean {
    const idx = this.attendance.findIndex(a => a.student_id === studentId && a.session_id === sessionId);
    const student = this.getStudentById(studentId);

    if (idx !== -1) {
      const updatedItem = {
        ...this.attendance[idx],
        status: newStatus,
        keterangan: keterangan || `Diubah manual oleh Admin menjadi ${newStatus}`,
      };
      this.attendance[idx] = updatedItem;
      this.saveToStorage(STORAGE_KEYS.ATTENDANCE, this.attendance);
      this.addLog('UPDATE_ATTENDANCE_STATUS', `Admin mengubah status presensi ${student?.nama || studentId} menjadi ${newStatus}`);

      // Instant Cross-Device Broadcast to PC & Mobile
      this.broadcastRealtimeMutation({
        entity: 'ATTENDANCE',
        action: 'UPDATE',
        payload: { id: this.attendance[idx].id, studentId, sessionId, newStatus, keterangan: updatedItem.keterangan },
      });

      if (isSupabaseConfigured && this.attendance[idx].id.length === 36) {
        safeCloud(
          supabase.from('attendance').update({
            status: newStatus,
            keterangan: this.attendance[idx].keterangan,
          }).eq('id', this.attendance[idx].id)
        );
      }

      return true;
    }

    const uuid = generateUUID();
    const newRec: AttendanceRecord = {
      id: uuid,
      student_id: studentId,
      session_id: sessionId,
      tanggal: new Date().toISOString().split('T')[0],
      waktu: new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date()),
      status: newStatus,
      face_verified: false,
      attendance_code: `MANUAL-${Date.now()}`,
      keterangan: keterangan || `Dicatat manual oleh Admin (${newStatus})`,
      verified_by_admin: 'admin-ketua-kelas',
      created_at: new Date().toISOString(),
    };

    this.attendance = [newRec, ...this.attendance];
    this.saveToStorage(STORAGE_KEYS.ATTENDANCE, this.attendance);
    this.addLog('UPDATE_ATTENDANCE_STATUS', `Admin mencatat presensi manual ${student?.nama || studentId}: ${newStatus}`);

    // Instant Cross-Device Broadcast to PC & Mobile
    this.broadcastRealtimeMutation({
      entity: 'ATTENDANCE',
      action: 'ADD',
      payload: newRec,
    });

    if (isSupabaseConfigured) {
      const validSessionId = sessionId.length === 36 
        ? sessionId 
        : (this.getActiveSession()?.id?.length === 36 ? this.getActiveSession()!.id : 'd8a7c39a-8bd1-4fad-a72f-b2ccdca03b58');
      const validStudentId = studentId.length === 36 
        ? studentId 
        : (this.getStudentById(studentId)?.id || studentId);

      safeCloud(
        supabase.from('attendance').upsert({
          id: uuid,
          student_id: validStudentId,
          session_id: validSessionId,
          tanggal: newRec.tanggal,
          waktu: newRec.waktu,
          status: newRec.status,
          attendance_code: newRec.attendance_code,
          keterangan: newRec.keterangan,
          created_at: newRec.created_at,
        })
      );
    }

    return true;
  }

  // ==================== SETTINGS ====================
  public getSettings(): SystemSettings {
    return this.settings;
  }

  public updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.settings = { ...this.settings, ...updates };
    this.saveToStorage(STORAGE_KEYS.SETTINGS, this.settings);
    this.addLog('LOGIN', 'Admin memperbarui pengaturan absensi sekolah');

    const activeSession = this.getActiveSession();
    if (activeSession && updates.late_threshold_time) {
      this.updateSession(activeSession.id, { batas_terlambat: updates.late_threshold_time });
    }

    // Instant Cross-Device Broadcast to PC & Mobile
    this.broadcastRealtimeMutation({
      entity: 'SETTINGS',
      action: 'UPDATE',
      payload: this.settings,
    });

    if (isSupabaseConfigured) {
      safeCloud(
        supabase.from('system_settings').upsert({
          key: 'general_settings',
          value: this.settings,
          updated_at: new Date().toISOString(),
        })
      );
    }

    this.notifySubscribers();
    return this.settings;
  }
}

export const dataStore = new DataStore();
