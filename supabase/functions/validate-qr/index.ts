// Supabase Edge Function: validate-qr
// Verifies QR token existence and expiration
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

    const { token } = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ valid: false, error: "QR_INVALID", message: "Token QR tidak valid." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { data: qr, error } = await supabaseClient
      .from("qr_tokens")
      .select("id, session_id, expires_at, status, attendance_sessions(*)")
      .eq("token", token)
      .maybeSingle()

    if (error || !qr) {
      return new Response(
        JSON.stringify({ valid: false, error: "QR_INVALID", message: "QR Code tidak ditemukan atau tidak valid." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const now = new Date()
    const expiresAt = new Date(qr.expires_at)

    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ valid: false, error: "QR_EXPIRED", message: "QR Code sudah tidak berlaku. Silakan scan QR terbaru." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ valid: true, session: qr.attendance_sessions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ valid: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
