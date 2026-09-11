// Supabase Edge Function: verify-attendance
// Public lookup to verify authenticity of Attendance ID / code
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    )

    const url = new URL(req.url)
    const code = url.searchParams.get("code")

    if (!code) {
      return new Response(
        JSON.stringify({ found: false, message: "Kode absensi wajib disertakan." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { data: record, error } = await supabaseClient
      .from("attendance")
      .select(`
        id,
        attendance_code,
        tanggal,
        waktu,
        status,
        distance,
        face_verified,
        created_at,
        students (
          nama,
          kelas,
          nomor_absen,
          nis
        ),
        attendance_sessions (
          nama_sesi
        )
      `)
      .or(`attendance_code.eq.${code},id.eq.${code}`)
      .maybeSingle()

    if (error || !record) {
      return new Response(
        JSON.stringify({ found: false, message: "Bukti absensi tidak ditemukan atau tidak valid." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({
        found: true,
        data: {
          attendance_code: record.attendance_code,
          nama: (record.students as any)?.nama,
          kelas: (record.students as any)?.kelas,
          nomor_absen: (record.students as any)?.nomor_absen,
          tanggal: record.tanggal,
          waktu: record.waktu,
          status: record.status,
          sesi: (record.attendance_sessions as any)?.nama_sesi,
          distance: record.distance,
          face_verified: record.face_verified,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ found: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
