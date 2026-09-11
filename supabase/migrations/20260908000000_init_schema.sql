-- ==============================================================================
-- PPLG 3 SMART ATTENDANCE - SUPABASE POSTGRESQL SCHEMA & MIGRATION
-- Class: XI PPLG 3 SMKN 1 Ciomas
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPHA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('UPCOMING', 'ACTIVE', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    status TEXT NOT NULL DEFAULT 'active',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. STUDENTS TABLE (Specific student attributes for XI PPLG 3)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nis TEXT UNIQUE NOT NULL,
    nisn TEXT UNIQUE NOT NULL,
    nomor_absen INT NOT NULL,
    nama TEXT NOT NULL,
    kelas TEXT NOT NULL DEFAULT 'XI PPLG 3',
    email TEXT UNIQUE NOT NULL,
    foto_url TEXT,
    device_token TEXT,
    device_info JSONB,
    face_descriptor JSONB,
    face_registered BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. ATTENDANCE SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_sesi TEXT NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_mulai TIME NOT NULL DEFAULT '06:30:00',
    jam_selesai TIME NOT NULL DEFAULT '07:30:00',
    batas_terlambat TIME NOT NULL DEFAULT '06:45:00',
    qr_expiry_seconds INT NOT NULL DEFAULT 30,
    latitude_sekolah NUMERIC(10, 7) NOT NULL DEFAULT -6.6025000,
    longitude_sekolah NUMERIC(10, 7) NOT NULL DEFAULT 106.7584000,
    radius_meter INT NOT NULL DEFAULT 100,
    face_verification_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    status session_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. DYNAMIC QR TOKENS TABLE
CREATE TABLE IF NOT EXISTS public.qr_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'valid'
);

-- 7. ATTENDANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu TIME NOT NULL DEFAULT CURRENT_TIME,
    status attendance_status NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    accuracy NUMERIC,
    distance NUMERIC,
    device_token TEXT,
    face_verified BOOLEAN NOT NULL DEFAULT FALSE,
    attendance_code TEXT UNIQUE NOT NULL,
    keterangan TEXT,
    verified_by_admin UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_student_session UNIQUE (student_id, session_id)
);

-- 8. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    description TEXT,
    device_info JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. INDEXES FOR HIGH-PERFORMANCE QUERIES
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_nisn ON public.students(nisn);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON public.attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tanggal ON public.attendance(tanggal);
CREATE INDEX IF NOT EXISTS idx_attendance_code ON public.attendance(attendance_code);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_token ON public.qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_expires ON public.qr_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- 11. HAVERSINE DISTANCE FORMULA IN POSTGRESQL (Returns distance in meters)
CREATE OR REPLACE FUNCTION public.calculate_haversine_distance(
    lat1 NUMERIC,
    lon1 NUMERIC,
    lat2 NUMERIC,
    lon2 NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    R CONSTANT NUMERIC := 6371000; -- Radius of Earth in meters
    dLat NUMERIC;
    dLon NUMERIC;
    a NUMERIC;
    c NUMERIC;
    radLat1 NUMERIC;
    radLat2 NUMERIC;
BEGIN
    radLat1 := radians(lat1);
    radLat2 := radians(lat2);
    dLat := radians(lat2 - lat1);
    dLon := radians(lon2 - lon1);

    a := sin(dLat / 2.0)^2 + cos(radLat1) * cos(radLat2) * sin(dLon / 2.0)^2;
    c := 2.0 * atan2(sqrt(a), sqrt(1.0 - a));

    RETURN round(R * c, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 12. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if requesting user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile or admin can read all" ON public.profiles;
CREATE POLICY "Users can read own profile or admin can read all"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_admin());

-- Students Policies
DROP POLICY IF EXISTS "Students can view own profile or admin view all" ON public.students;
CREATE POLICY "Students can view own profile or admin view all"
ON public.students FOR SELECT
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
CREATE POLICY "Admins can manage students"
ON public.students FOR ALL
USING (public.is_admin());

-- Attendance Sessions Policies
DROP POLICY IF EXISTS "Anyone authenticated can view sessions" ON public.attendance_sessions;
CREATE POLICY "Anyone authenticated can view sessions"
ON public.attendance_sessions FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage sessions" ON public.attendance_sessions;
CREATE POLICY "Admins can manage sessions"
ON public.attendance_sessions FOR ALL
USING (public.is_admin());

-- QR Tokens Policies
DROP POLICY IF EXISTS "Authenticated users can read valid tokens" ON public.qr_tokens;
CREATE POLICY "Authenticated users can read valid tokens"
ON public.qr_tokens FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage qr tokens" ON public.qr_tokens;
CREATE POLICY "Admins can manage qr tokens"
ON public.qr_tokens FOR ALL
USING (public.is_admin());

-- Attendance Policies
DROP POLICY IF EXISTS "Students view own attendance or admin view all" ON public.attendance;
CREATE POLICY "Students view own attendance or admin view all"
ON public.attendance FOR SELECT
USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR public.is_admin()
);

DROP POLICY IF EXISTS "Admins can modify attendance records" ON public.attendance;
CREATE POLICY "Admins can modify attendance records"
ON public.attendance FOR ALL
USING (public.is_admin());

-- Activity Logs Policies
DROP POLICY IF EXISTS "Admins can read all logs" ON public.activity_logs;
CREATE POLICY "Admins can read all logs"
ON public.activity_logs FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can insert activity log" ON public.activity_logs;
CREATE POLICY "Authenticated users can insert activity log"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- System Settings Policies
DROP POLICY IF EXISTS "Anyone authenticated can read settings" ON public.system_settings;
CREATE POLICY "Anyone authenticated can read settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.system_settings;
CREATE POLICY "Admins can manage settings"
ON public.system_settings FOR ALL
USING (public.is_admin());

-- 13. SECURE STORED PROCEDURES (RPC)

-- Function: Generate Dynamic QR Token
CREATE OR REPLACE FUNCTION public.generate_dynamic_qr(
    p_session_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_token TEXT;
    v_expiry_sec INT;
    v_expires_at TIMESTAMPTZ;
    v_session RECORD;
BEGIN
    SELECT * INTO v_session FROM public.attendance_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND';
    END IF;

    IF v_session.status != 'ACTIVE' THEN
        RAISE EXCEPTION 'SESSION_INACTIVE';
    END IF;

    v_expiry_sec := COALESCE(v_session.qr_expiry_seconds, 30);
    v_token := encode(gen_random_bytes(24), 'hex');
    v_expires_at := now() + (v_expiry_sec || ' seconds')::interval;

    INSERT INTO public.qr_tokens (session_id, token, expires_at)
    VALUES (p_session_id, v_token, v_expires_at);

    RETURN jsonb_build_object(
        'token', v_token,
        'expires_at', v_expires_at,
        'valid_seconds', v_expiry_sec
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Submit Attendance Securely (Self-service by student)
CREATE OR REPLACE FUNCTION public.submit_attendance_secure(
    p_token TEXT,
    p_student_id UUID,
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_accuracy NUMERIC,
    p_device_token TEXT,
    p_device_info JSONB,
    p_face_verified BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
    v_qr RECORD;
    v_session RECORD;
    v_student RECORD;
    v_distance NUMERIC;
    v_status attendance_status;
    v_current_time TIME;
    v_att_code TEXT;
    v_att_id UUID;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- 1. Validate Student
    SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'STUDENT_NOT_FOUND', 'message', 'Data siswa tidak ditemukan.');
    END IF;

    -- 2. Validate QR Token
    SELECT * INTO v_qr FROM public.qr_tokens WHERE token = p_token;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'QR_INVALID', 'message', 'QR Code tidak valid atau tidak ditemukan.');
    END IF;

    IF v_qr.expires_at < now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'QR_EXPIRED', 'message', 'QR Code sudah tidak berlaku. Silakan scan QR terbaru.');
    END IF;

    -- 3. Validate Session
    SELECT * INTO v_session FROM public.attendance_sessions WHERE id = v_qr.session_id;
    IF NOT FOUND OR v_session.status != 'ACTIVE' THEN
        RETURN jsonb_build_object('success', false, 'error', 'SESSION_CLOSED', 'message', 'Sesi absensi ini sudah ditutup.');
    END IF;

    -- 4. Validate Duplicate Attendance
    IF EXISTS (
        SELECT 1 FROM public.attendance
        WHERE student_id = p_student_id AND session_id = v_session.id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_ATTENDED', 'message', 'Kamu sudah melakukan absensi untuk sesi ini.');
    END IF;

    -- 5. Validate Device Token
    IF v_student.device_token IS NULL THEN
        -- First time binding device
        UPDATE public.students
        SET device_token = p_device_token, device_info = p_device_info, updated_at = now()
        WHERE id = p_student_id;
    ELSIF v_student.device_token != p_device_token THEN
        RETURN jsonb_build_object('success', false, 'error', 'DEVICE_REJECTED', 'message', 'Device ini belum terdaftar untuk akun kamu. Hubungi admin/ketua kelas.');
    END IF;

    -- 6. Validate GPS Accuracy
    IF p_accuracy IS NULL OR p_accuracy > 150 THEN
        RETURN jsonb_build_object('success', false, 'error', 'GPS_ACCURACY_LOW', 'message', 'GPS kurang akurat (>150m). Silakan aktifkan lokasi dengan lebih baik dan coba lagi.');
    END IF;

    -- 7. Validate Distance to School (Server-Side)
    v_distance := public.calculate_haversine_distance(
        p_latitude, p_longitude,
        v_session.latitude_sekolah, v_session.longitude_sekolah
    );

    IF v_distance > v_session.radius_meter THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'OUTSIDE_RADIUS',
            'message', 'Kamu berada di luar area absensi. Jarak kamu dari sekolah: ' || round(v_distance) || ' meter. Maksimal: ' || v_session.radius_meter || ' meter.',
            'distance', v_distance,
            'max_radius', v_session.radius_meter
        );
    END IF;

    -- 8. Validate Face Verification if Required
    IF v_session.face_verification_enabled AND NOT p_face_verified THEN
        RETURN jsonb_build_object('success', false, 'error', 'FACE_FAILED', 'message', 'Verifikasi wajah gagal atau belum diselesaikan.');
    END IF;

    -- 9. Determine Status (HADIR vs TERLAMBAT) based on Asia/Jakarta server time
    v_current_time := CURRENT_TIME;
    IF v_current_time > v_session.batas_terlambat THEN
        v_status := 'TERLAMBAT';
    ELSE
        v_status := 'HADIR';
    END IF;

    -- 10. Generate Attendance Code (ATT-YYYYMMDD-XXXXX)
    v_att_code := 'ATT-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 5));

    -- 11. Insert Attendance Record
    INSERT INTO public.attendance (
        student_id, session_id, tanggal, waktu, status,
        latitude, longitude, accuracy, distance,
        device_token, face_verified, attendance_code
    ) VALUES (
        p_student_id, v_session.id, v_today, v_current_time, v_status,
        p_latitude, p_longitude, p_accuracy, v_distance,
        p_device_token, p_face_verified, v_att_code
    ) RETURNING id INTO v_att_id;

    -- 12. Record Activity Log
    INSERT INTO public.activity_logs (user_id, action, description, device_info)
    VALUES (
        v_student.user_id,
        'ATTENDANCE_SUCCESS',
        'Absensi berhasil: ' || v_student.nama || ' (' || v_status || ') - Jarak: ' || round(v_distance) || 'm',
        p_device_info
    );

    RETURN jsonb_build_object(
        'success', true,
        'attendance_id', v_att_id,
        'attendance_code', v_att_code,
        'status', v_status,
        'nama', v_student.nama,
        'waktu', v_current_time,
        'tanggal', v_today,
        'distance', v_distance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Admin Quick Scan Student (Ketua Kelas / Admin direct QR scan of student card)
CREATE OR REPLACE FUNCTION public.admin_scan_student_attendance(
    p_student_id UUID,
    p_session_id UUID,
    p_status attendance_status DEFAULT 'HADIR',
    p_keterangan TEXT DEFAULT 'Discan langsung oleh Admin / Ketua Kelas'
) RETURNS JSONB AS $$
DECLARE
    v_att_code TEXT;
    v_att_id UUID;
    v_student RECORD;
    v_session RECORD;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized. Hanya admin / ketua kelas yang dapat melakukan scan ini.');
    END IF;

    SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Siswa tidak ditemukan.');
    END IF;

    SELECT * INTO v_session FROM public.attendance_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sesi tidak ditemukan.');
    END IF;

    -- Check if already attended
    IF EXISTS (
        SELECT 1 FROM public.attendance
        WHERE student_id = p_student_id AND session_id = p_session_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Siswa ' || v_student.nama || ' sudah diabsenkan sebelumnya pada sesi ini.');
    END IF;

    v_att_code := 'ADMIN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 5));

    INSERT INTO public.attendance (
        student_id, session_id, tanggal, waktu, status,
        attendance_code, keterangan, verified_by_admin
    ) VALUES (
        p_student_id, p_session_id, CURRENT_DATE, CURRENT_TIME, p_status,
        v_att_code, p_keterangan, auth.uid()
    ) RETURNING id INTO v_att_id;

    INSERT INTO public.activity_logs (user_id, action, description)
    VALUES (
        auth.uid(),
        'ADMIN_SCAN_ATTENDANCE',
        'Admin / Ketua Kelas meng-scan siswa: ' || v_student.nama || ' (' || p_status || ')'
    );

    RETURN jsonb_build_object(
        'success', true,
        'attendance_id', v_att_id,
        'attendance_code', v_att_code,
        'nama', v_student.nama,
        'nomor_absen', v_student.nomor_absen,
        'status', p_status,
        'message', 'Berhasil mencatat kehadiran ' || v_student.nama
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Admin Override Attendance Status (ONLY ADMIN)
CREATE OR REPLACE FUNCTION public.admin_update_attendance_status(
    p_student_id UUID,
    p_session_id UUID,
    p_new_status attendance_status,
    p_keterangan TEXT
) RETURNS JSONB AS $$
DECLARE
    v_att_code TEXT;
    v_record RECORD;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized. Hanya admin atau ketua kelas yang dapat mengubah status.');
    END IF;

    SELECT * INTO v_record FROM public.attendance
    WHERE student_id = p_student_id AND session_id = p_session_id;

    IF FOUND THEN
        UPDATE public.attendance
        SET status = p_new_status,
            keterangan = p_keterangan,
            verified_by_admin = auth.uid()
        WHERE id = v_record.id;
    ELSE
        v_att_code := 'MANUAL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 5));
        INSERT INTO public.attendance (
            student_id, session_id, tanggal, waktu, status,
            attendance_code, keterangan, verified_by_admin
        ) VALUES (
            p_student_id, p_session_id, CURRENT_DATE, CURRENT_TIME, p_new_status,
            v_att_code, p_keterangan, auth.uid()
        );
    END IF;

    INSERT INTO public.activity_logs (user_id, action, description)
    VALUES (
        auth.uid(),
        'UPDATE_ATTENDANCE_STATUS',
        'Admin mengubah status kehadiran siswa id ' || p_student_id || ' menjadi ' || p_new_status
    );

    RETURN jsonb_build_object('success', true, 'message', 'Status kehadiran berhasil diperbarui.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Admin Reset Student Device (ONLY ADMIN)
CREATE OR REPLACE FUNCTION public.admin_reset_student_device(
    p_student_id UUID
) RETURNS JSONB AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized.');
    END IF;

    UPDATE public.students
    SET device_token = NULL, device_info = NULL, updated_at = now()
    WHERE id = p_student_id;

    INSERT INTO public.activity_logs (user_id, action, description)
    VALUES (
        auth.uid(),
        'RESET_DEVICE',
        'Admin mereset binding device untuk siswa id: ' || p_student_id
    );

    RETURN jsonb_build_object('success', true, 'message', 'Device siswa berhasil di-reset.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. SEED DATA FOR SYSTEM SETTINGS & DEFAULT SESSION
INSERT INTO public.system_settings (key, value)
VALUES
    ('school_info', '{"name": "SMKN 1 Ciomas", "class": "XI PPLG 3", "total_students": 45}'),
    ('location', '{"latitude": -6.6025000, "longitude": 106.7584000, "radius_meters": 100}'),
    ('attendance_rules', '{"default_qr_expiry_seconds": 30, "late_threshold_time": "06:45:00", "face_verification_default": false}')
ON CONFLICT (key) DO NOTHING;

-- Create Today's Default Attendance Session if none exists
INSERT INTO public.attendance_sessions (
    nama_sesi, tanggal, jam_mulai, jam_selesai, batas_terlambat,
    qr_expiry_seconds, latitude_sekolah, longitude_sekolah, radius_meter,
    face_verification_enabled, status
)
SELECT
    'Absensi Pagi - XI PPLG 3',
    CURRENT_DATE,
    '06:30:00',
    '07:30:00',
    '06:45:00',
    30,
    -6.6025000,
    106.7584000,
    100,
    false,
    'ACTIVE'
WHERE NOT EXISTS (
    SELECT 1 FROM public.attendance_sessions WHERE tanggal = CURRENT_DATE
);
