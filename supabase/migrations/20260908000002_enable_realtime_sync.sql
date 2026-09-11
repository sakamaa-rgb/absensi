-- ==============================================================================
-- 20260908000002_enable_realtime_sync.sql
-- SINKRONISASI REAL-TIME WINDOWS (LAPTOP/PC) & MOBILE (HP/SMARTPHONE)
-- ==============================================================================

-- 1. Buka Akses Publik/Anonim untuk Siswa & Admin agar sinkron antar-perangkat
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_tokens DISABLE ROW LEVEL SECURITY;

-- 2. Aktifkan Supabase Realtime Replication pada Tabel Utama
-- Supaya setiap perubahan Tambah/Edit/Hapus di Windows langsung terkirim ke HP seketika
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'students'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'attendance'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'activity_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'system_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;
    END IF;
END $$;
