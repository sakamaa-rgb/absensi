-- ==============================================================================
-- 20260908000002_enable_realtime_sync.sql
-- SINKRONISASI REAL-TIME WINDOWS (LAPTOP/PC) & MOBILE (HP/SMARTPHONE)
-- ==============================================================================

-- 1. Matikan RLS agar website Windows & Mobile bisa membaca dan menyimpan data secara realtime
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_tokens DISABLE ROW LEVEL SECURITY;

-- 2. Aktifkan Realtime Replication untuk semua tabel (Aman dari error jika sudah terdaftar)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_tokens;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
