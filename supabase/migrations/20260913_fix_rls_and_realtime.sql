-- ==============================================================================
-- PPLG 3 SMART ATTENDANCE - FIX ROW LEVEL SECURITY & ENABLE REALTIME PUBLICATION
-- Permintaan Sinkronisasi Lintas Perangkat (Window PC <-> Mobile HP)
-- Jalankan query ini di Supabase SQL Editor: Dashboard -> SQL Editor -> New query
-- ==============================================================================

-- 1. PASTIKAN ROW LEVEL SECURITY (RLS) TIDAK MEMBLOKIR AKSI DARI APLIKASI
-- Memberikan izin lengkap untuk operasi anon (aplikasi absensi siswa & admin kelas)

-- Tabel: students
ALTER TABLE IF EXISTS public.students ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for anon on students" ON public.students;
CREATE POLICY "Allow all operations for anon on students"
    ON public.students
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Tabel: attendance
ALTER TABLE IF EXISTS public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for anon on attendance" ON public.attendance;
CREATE POLICY "Allow all operations for anon on attendance"
    ON public.attendance
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Tabel: attendance_sessions
ALTER TABLE IF EXISTS public.attendance_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for anon on attendance_sessions" ON public.attendance_sessions;
CREATE POLICY "Allow all operations for anon on attendance_sessions"
    ON public.attendance_sessions
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Tabel: activity_logs
ALTER TABLE IF EXISTS public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for anon on activity_logs" ON public.activity_logs;
CREATE POLICY "Allow all operations for anon on activity_logs"
    ON public.activity_logs
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Tabel: system_settings
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for anon on system_settings" ON public.system_settings;
CREATE POLICY "Allow all operations for anon on system_settings"
    ON public.system_settings
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Tabel: qr_tokens
ALTER TABLE IF EXISTS public.qr_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for anon on qr_tokens" ON public.qr_tokens;
CREATE POLICY "Allow all operations for anon on qr_tokens"
    ON public.qr_tokens
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 2. AKTIFKAN REPLIKASI SUPABASE REALTIME UNTUK SELURUH TABEL
-- Memastikan perubahan di database otomatis disiarkan langsung ke semua browser yang terhubung (PC & HP)
DO $$
BEGIN
    -- Tambahkan tabel ke publikasi realtime jika belum terdaftar
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'students'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'attendance'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'attendance_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'activity_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'system_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
    END IF;
END $$;
