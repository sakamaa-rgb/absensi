import type { 
  Student, 
  AttendanceSession, 
  AttendanceRecord, 
  ActivityLog, 
  SystemSettings, 
  AttendanceStatus 
} from '../types/database';
import { INITIAL_STUDENTS, INITIAL_SETTINGS, INITIAL_SESSION } from '../lib/mockData';
import { calculateHaversineDistance, type UserLocation } from '../lib/location';
import { safeStorage } from '../lib/storage';

const STORAGE_KEYS = {
  STUDENTS: 'pplg3_students',
  SESSIONS: 'pplg3_sessions',
  ATTENDANCE: 'pplg3_attendance',
  LOGS: 'pplg3_activity_logs',
  SETTINGS: 'pplg3_settings',
  QR_TOKENS: 'pplg3_qr_tokens',
};


class DataStore {
  private students: Student[];
  private sessions: AttendanceSession[];
  private attendance: AttendanceRecord[];
  private logs: ActivityLog[];
  private settings: SystemSettings;
  private currentQrToken: { token: string; expiresAt: number; sessionId: string } | null = null;
  private subscribers: Array<() => void> = [];
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    const storedStudents = this.loadFromStorage<Student[]>(STORAGE_KEYS.STUDENTS, []);
    const hasDummy = storedStudents.some(s => s.nama === 'Achmad Fauzi' || s.id === 'std-1');

    if (hasDummy) {
      // Hapus seluruh data dummy bawaan
      this.students = [];
      this.attendance = [];
      this.logs = [];
      this.saveToStorage(STORAGE_KEYS.STUDENTS, []);
      this.saveToStorage(STORAGE_KEYS.ATTENDANCE, []);
      this.saveToStorage(STORAGE_KEYS.LOGS, []);
    } else {
      this.students = storedStudents.map(s => {
        if (!s.foto_url) {
          const backupPhoto = safeStorage.getItem(`pplg3_foto_${s.id}`) || safeStorage.getItem(`pplg3_foto_nisn_${s.nisn}`);
          if (backupPhoto) return { ...s, foto_url: backupPhoto };
        }
        return s;
      });
      this.attendance = this.loadFromStorage(STORAGE_KEYS.ATTENDANCE, []);
      this.logs = this.loadFromStorage(STORAGE_KEYS.LOGS, []);
    }

    this.sessions = this.loadFromStorage(STORAGE_KEYS.SESSIONS, [INITIAL_SESSION]);
    this.settings = this.loadFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);

    // Initial log if empty
    if (this.logs.length === 0) {
      this.addLog('LOGIN', 'Sistem Absensi XI PPLG 3 diinisialisasi (Data bersih)');
    }

    // Setup Cross-Tab & Cross-Window Instant Real-Time Sync
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
        } catch {
          // BroadcastChannel fallback to storage event
        }
      }

      // Storage event listener fallback (for multi-tab / window sync)
      window.addEventListener('storage', (e) => {
        if (e.key && Object.values(STORAGE_KEYS).includes(e.key)) {
          this.reloadAllFromStorage();
          this.notifySubscribers();
        }
      });
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
        } catch {
          // Ignore postMessage error if channel closed
        }
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

  // ==================== LOGS ====================
  public addLog(action: ActivityLog['action'], description: string, user_id?: string, device_info?: any) {
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

  public updateStudent(id: string, updates: Partial<Student>): boolean {
    const idx = this.students.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.students[idx] = { ...this.students[idx], ...updates, updated_at: new Date().toISOString() };
    
    // Backup photo to dedicated storage keys to prevent data loss on quota limits
    if (updates.foto_url !== undefined) {
      if (updates.foto_url) {
        safeStorage.setItem(`pplg3_foto_${id}`, updates.foto_url);
        if (this.students[idx].nisn) {
          safeStorage.setItem(`pplg3_foto_nisn_${this.students[idx].nisn}`, updates.foto_url);
        }
      } else {
        safeStorage.removeItem(`pplg3_foto_${id}`);
        if (this.students[idx].nisn) {
          safeStorage.removeItem(`pplg3_foto_nisn_${this.students[idx].nisn}`);
        }
      }
    }

    this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);
    return true;
  }

  public resetStudentDevice(studentId: string): boolean {
    const student = this.getStudentById(studentId);
    if (!student) return false;
    this.updateStudent(studentId, { device_token: null, device_info: null });
    this.addLog('RESET_DEVICE', `Admin mereset binding device untuk siswa: ${student.nama} (Absen: ${student.nomor_absen})`);
    return true;
  }

  public addStudent(studentData: Omit<Student, 'id'>): Student {
    const newStudent: Student = {
      ...studentData,
      id: 'std-' + (this.students.length + 1) + '-' + Date.now(),
      status: 'active',
      created_at: new Date().toISOString(),
    };
    this.students.push(newStudent);
    this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);
    this.addLog('LOGIN', `Admin menambahkan siswa baru: ${newStudent.nama}`);
    return newStudent;
  }

  public deleteStudent(id: string): boolean {
    const student = this.getStudentById(id);
    if (!student) return false;
    this.students = this.students.filter(s => s.id !== id);
    this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);
    this.addLog('LOGIN', `Admin menghapus data siswa: ${student.nama} (Absen: ${student.nomor_absen})`);
    return true;
  }

  public deleteAllStudents(): number {
    const count = this.students.length;
    this.students = [];
    this.saveToStorage(STORAGE_KEYS.STUDENTS, this.students);
    this.addLog('LOGIN', `Admin menghapus semua data siswa (${count} siswa)`);
    return count;
  }

  // ==================== SESSIONS ====================
  public getSessions(): AttendanceSession[] {
    return this.sessions;
  }

  public getActiveSession(): AttendanceSession | undefined {
    return this.sessions.find(s => s.status === 'ACTIVE');
  }

  public addSession(sessionData: Omit<AttendanceSession, 'id'>): AttendanceSession {
    const newSession: AttendanceSession = {
      ...sessionData,
      id: 'ses-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    this.sessions = [newSession, ...this.sessions];
    this.saveToStorage(STORAGE_KEYS.SESSIONS, this.sessions);
    return newSession;
  }

  public updateSession(id: string, updates: Partial<AttendanceSession>): boolean {
    const idx = this.sessions.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.sessions[idx] = { ...this.sessions[idx], ...updates };
    this.saveToStorage(STORAGE_KEYS.SESSIONS, this.sessions);
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

    // Generate fresh random secure dynamic token
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
    // Populate student and session references
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

    // 1. Dynamic QR Validation
    const now = Date.now();
    if (!this.currentQrToken || this.currentQrToken.token !== scannedToken) {
      this.addLog('QR_EXPIRED', `Scan QR gagal (Invalid Token) oleh ${student.nama}`, student.user_id || undefined, deviceInfo);
      return { success: false, error: 'QR_INVALID', message: 'QR Code tidak valid atau sudah kadaluarsa. Silakan scan QR terbaru.' };
    }

    if (now > this.currentQrToken.expiresAt) {
      this.addLog('QR_EXPIRED', `Scan QR kadaluarsa oleh ${student.nama}`, student.user_id || undefined, deviceInfo);
      return { success: false, error: 'QR_EXPIRED', message: 'QR Code sudah tidak berlaku. Silakan scan QR terbaru.' };
    }

    const session = this.getActiveSession();
    if (!session || session.status !== 'ACTIVE') {
      return { success: false, error: 'SESSION_CLOSED', message: 'Sesi absensi ini sudah ditutup atau tidak aktif.' };
    }

    // 2. Duplicate Attendance Check
    if (this.isAlreadyAttended(studentId, session.id)) {
      return { success: false, error: 'ALREADY_ATTENDED', message: 'Kamu sudah melakukan absensi untuk sesi ini.' };
    }

    // 3. Device Verification
    if (!student.device_token) {
      // First time registration
      this.updateStudent(studentId, { device_token: deviceToken, device_info: deviceInfo });
      this.addLog('DEVICE_CHECKED', `Device pertama berhasil didaftarkan untuk ${student.nama}`, student.user_id || undefined, deviceInfo);
    } else if (student.device_token !== deviceToken) {
      this.addLog('DEVICE_REJECTED', `Device tidak cocok untuk ${student.nama}`, student.user_id || undefined, deviceInfo);
      return { 
        success: false, 
        error: 'DEVICE_REJECTED', 
        message: 'Device ini belum terdaftar untuk akun kamu. Hubungi admin atau ketua kelas untuk reset device.' 
      };
    }

    // 4. GPS Accuracy Check
    if (location.accuracy > 150) {
      this.addLog('LOCATION_REJECTED', `GPS akurasi rendah (±${Math.round(location.accuracy)}m) oleh ${student.nama}`);
      return {
        success: false,
        error: 'GPS_ACCURACY_LOW',
        message: 'GPS kurang akurat. Silakan aktifkan GPS akurasi tinggi dan coba lagi.',
      };
    }

    // 5. GPS Haversine Distance to School Validation
    const distance = calculateHaversineDistance(
      location.latitude,
      location.longitude,
      session.latitude_sekolah,
      session.longitude_sekolah
    );

    if (distance > session.radius_meter) {
      this.addLog('LOCATION_REJECTED', `Di luar radius (${distance}m > ${session.radius_meter}m) oleh ${student.nama}`);
      return {
        success: false,
        error: 'OUTSIDE_RADIUS',
        message: `Kamu berada di luar area absensi. Jarak kamu dari sekolah: ${distance} meter. Maksimal: ${session.radius_meter} meter.`,
      };
    }

    // 6. Face Verification Check (if enabled)
    if (session.face_verification_enabled && !faceVerified) {
      this.addLog('FACE_FAILED', `Verifikasi wajah gagal oleh ${student.nama}`);
      return {
        success: false,
        error: 'FACE_FAILED',
        message: 'Wajah tidak berhasil diverifikasi. Silakan coba lagi.',
      };
    }

    // 7. Status determination (HADIR vs TERLAMBAT) based on current Jakarta time
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

    const newRecord: AttendanceRecord = {
      id: 'att-' + Date.now(),
      student_id: studentId,
      session_id: session.id,
      tanggal: new Date().toISOString().split('T')[0],
      waktu: currentTimeStr,
      status: finalStatus,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      distance: distance,
      device_token: deviceToken,
      face_verified: faceVerified,
      attendance_code: attendanceCode,
      keterangan: isLate ? 'Terlambat melewati batas waktu' : 'Absensi tepat waktu',
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

    return {
      success: true,
      message: `Absensi berhasil dicatat sebagai ${finalStatus}!`,
      record: {
        ...newRecord,
        student,
        session,
      },
    };
  }

  /**
   * Admin / Ketua Kelas direct scan of student digital QR code
   * (Allows Ketua Kelas to scan all students one-by-one in classroom)
   */
  public adminScanStudent(
    studentIdOrNis: string, 
    forcedStatus?: AttendanceStatus,
    customCoords?: { latitude: number; longitude: number; distance?: number; accuracy?: number }
  ): {
    success: boolean;
    message: string;
    student?: Student;
    record?: AttendanceRecord;
    isSuspicious?: boolean;
  } {
    let cleanKey = studentIdOrNis.trim();
    let dynamicCoords: { latitude: number; longitude: number; distance?: number; accuracy?: number } | undefined;

    if (cleanKey.startsWith('{') && cleanKey.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanKey);
        cleanKey = parsed.nis || parsed.nisn || parsed.id || parsed.studentId || cleanKey;

        // Anti-Titip Absen: Cek Usia QR (Mencegah Screenshot / Gambar Simpanan di HP Teman)
        if (parsed.time || parsed.timestamp) {
          const qrTime = Number(parsed.time || parsed.timestamp);
          const ageSeconds = (Date.now() - qrTime) / 1000;
          if (ageSeconds > 90) {
            return {
              success: false,
              isSuspicious: true,
              message: `⚠️ QR KADALUARSA (${Math.round(ageSeconds)} detik lalu)! Terdeteksi screenshot atau QR simpanan. Siswa wajib membuka aplikasi langsung di HP-nya!`,
            };
          }
        }

        // Koordinat GPS Riil dari HP Siswa saat meng-generate QR
        if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          dynamicCoords = {
            latitude: Number(parsed.lat.toFixed(7)),
            longitude: Number(parsed.lng.toFixed(7)),
            accuracy: parsed.accuracy ? Number(parsed.accuracy) : 5,
          };
        }
      } catch {
        // use cleanKey as is
      }
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

    // Check duplicate
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

    // Prioritaskan koordinat riil siswa dari Dynamic QR jika tersedia
    const lat = dynamicCoords?.latitude ?? customCoords?.latitude ?? schoolLat;
    const lng = dynamicCoords?.longitude ?? customCoords?.longitude ?? schoolLng;
    const dist = dynamicCoords 
      ? calculateHaversineDistance(lat, lng, schoolLat, schoolLng)
      : (customCoords?.distance ?? 0);
    const accuracy = dynamicCoords?.accuracy ?? customCoords?.accuracy ?? 5;

    // Catat lokasi koordinat riil siswa secara presisi
    const locationNote = dynamicCoords 
      ? `Koordinat Siswa: [${lat.toFixed(5)}, ${lng.toFixed(5)}] • Jarak: ${Math.round(dist)}m dari titik sekolah`
      : 'Koordinat lokasi tercatat';

    const attendanceCode = `ADMIN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const newRecord: AttendanceRecord = {
      id: 'att-admin-' + Date.now(),
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

  /**
   * Admin updates or overrides attendance status manually
   * ONLY ADMIN is authorized to invoke this!
   */
  public adminUpdateAttendanceStatus(
    studentId: string, 
    sessionId: string, 
    newStatus: AttendanceStatus, 
    keterangan: string
  ): boolean {
    const student = this.getStudentById(studentId);
    const existingIndex = this.attendance.findIndex(a => a.student_id === studentId && a.session_id === sessionId);

    if (existingIndex >= 0) {
      this.attendance[existingIndex] = {
        ...this.attendance[existingIndex],
        status: newStatus,
        keterangan: keterangan || `Diubah manual oleh Admin menjadi ${newStatus}`,
      };
    } else {
      // Create new manual attendance record for this student
      const currentTimeStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date());

      const newRecord: AttendanceRecord = {
        id: 'att-manual-' + Date.now(),
        student_id: studentId,
        session_id: sessionId,
        tanggal: new Date().toISOString().split('T')[0],
        waktu: currentTimeStr,
        status: newStatus,
        attendance_code: `MANUAL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        keterangan: keterangan || `Diinput manual oleh Admin (${newStatus})`,
        verified_by_admin: 'admin-ketua-kelas',
        face_verified: false,
        created_at: new Date().toISOString(),
      };
      this.attendance = [newRecord, ...this.attendance];
    }

    this.saveToStorage(STORAGE_KEYS.ATTENDANCE, this.attendance);
    this.addLog(
      'UPDATE_ATTENDANCE_STATUS',
      `Admin mengubah status kehadiran ${student?.nama || studentId} menjadi ${newStatus}`
    );
    return true;
  }

  // ==================== SETTINGS ====================
  public getSettings(): SystemSettings {
    return this.settings;
  }

  public updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.settings = { ...this.settings, ...updates };
    this.saveToStorage(STORAGE_KEYS.SETTINGS, this.settings);
    return this.settings;
  }
}

export const dataStore = new DataStore();
