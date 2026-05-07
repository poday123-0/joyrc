import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.startsWith("960") ? digits : `960${digits}`;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendMessageOwlSms(apiKey: string, sender: string, to: string, message: string) {
  // Message Owl REST SMS API
  const res = await fetch("https://rest.msgowl.com/messages", {
    method: "POST",
    headers: {
      "Authorization": `AccessKey ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipients: to,
      sender_id: sender,
      body: message,
    }),
  });
  const text = await res.text();
  console.log("MsgOwl response:", res.status, text);
  if (!res.ok) {
    throw new Error(`Message Owl error [${res.status}]: ${text}`);
  }
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { mobile_number } = await req.json();
    if (!mobile_number || typeof mobile_number !== "string") {
      return new Response(JSON.stringify({ error: "Mobile number required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const phone = normalizePhone(mobile_number);
    if (phone.length < 7) {
      return new Response(JSON.stringify({ error: "Invalid mobile number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check SMS enabled
    const { data: settings } = await admin
      .from("system_settings")
      .select("sms_login_enabled, sms_sender_id, sms_api_key_set")
      .limit(1).maybeSingle();
    if (!settings?.sms_login_enabled || !settings?.sms_api_key_set) {
      return new Response(JSON.stringify({ error: "SMS login is disabled" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user exists with this mobile (try both with and without 960 prefix)
    const localPhone = phone.startsWith("960") ? phone.slice(3) : phone;
    const { data: profile } = await admin
      .from("profiles")
      .select("user_id")
      .or(`mobile_number.eq.${phone},mobile_number.eq.${localPhone}`)
      .maybeSingle();
    if (!profile) {
      return new Response(JSON.stringify({ error: "No account found with this mobile number" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 1 OTP every 30s for the same number
    const { data: recent } = await admin
      .from("otp_codes")
      .select("created_at")
      .eq("mobile_number", phone)
      .gt("created_at", new Date(Date.now() - 30_000).toISOString())
      .limit(1);
    if (recent && recent.length > 0) {
      return new Response(JSON.stringify({ error: "Please wait a moment before requesting a new code" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Invalidate previous unused codes for this number
    await admin.from("otp_codes").update({ consumed: true }).eq("mobile_number", phone).eq("consumed", false);

    const { error: insErr } = await admin.from("otp_codes").insert({
      mobile_number: phone, code_hash, expires_at,
    });
    if (insErr) throw insErr;

    // Get API key
    const { data: cred } = await admin.from("sms_credentials").select("api_key").limit(1).maybeSingle();
    const apiKey = cred?.api_key || Deno.env.get("MESSAGEOWL_API_KEY");
    if (!apiKey) throw new Error("SMS API key not configured");

    const sender = settings.sms_sender_id || "RCJOY";
    await sendMessageOwlSms(apiKey, sender, phone, `Your ${sender} login code is ${code}. Valid for 5 minutes.`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    console.error("send-otp error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
