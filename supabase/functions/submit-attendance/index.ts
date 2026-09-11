// Supabase Edge Function: submit-attendance
// Validates server-side logic: QR token, GPS location, device binding, duplicate prevention
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const payload = await req.json()
    const {
      token,
      student_id,
      latitude,
      longitude,
      accuracy,
      device_token,
      device_info,
      face_verified,
    } = payload

    if (!token || !student_id || latitude === undefined || longitude === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: "MISSING_DATA", message: "Parameter data absensi tidak lengkap." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Invoke atomic stored procedure in PostgreSQL
    const { data, error } = await supabaseClient.rpc("submit_attendance_secure", {
      p_token: token,
      p_student_id: student_id,
      p_latitude: latitude,
      p_longitude: longitude,
      p_accuracy: accuracy || 10,
      p_device_token: device_token || "unknown_device",
      p_device_info: device_info || {},
      p_face_verified: !!face_verified,
    })

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: "DB_ERROR", message: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: "SERVER_ERROR", message: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
