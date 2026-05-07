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

async function sendMessageOwlSms(apiKey: string, sender: string, to: string, message: string) {
  const res = await fetch("https://rest.msgowl.com/messages", {
    method: "POST",
    headers: {
      "Authorization": `AccessKey ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipients: to, sender_id: sender, body: message }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`MsgOwl [${res.status}]: ${text}`);
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Auth check
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = roles?.some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, recipients } = await req.json();
    if (!message || typeof message !== "string" || !message.trim()) {
      return new Response(JSON.stringify({ error: "Message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return new Response(JSON.stringify({ error: "Recipients required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await admin
      .from("system_settings")
      .select("sms_sender_id, sms_api_key_set")
      .limit(1).maybeSingle();

    const { data: cred } = await admin.from("sms_credentials").select("api_key").limit(1).maybeSingle();
    const apiKey = cred?.api_key || Deno.env.get("MESSAGEOWL_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "SMS API key not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sender = settings?.sms_sender_id || "RCJOY";

    let sent = 0;
    const failures: { phone: string; error: string }[] = [];
    for (const raw of recipients) {
      if (!raw || typeof raw !== "string") continue;
      const phone = normalizePhone(raw);
      if (phone.length < 7) continue;
      try {
        await sendMessageOwlSms(apiKey, sender, phone, message);
        sent++;
      } catch (e: any) {
        failures.push({ phone, error: e?.message || "send failed" });
      }
    }

    return new Response(JSON.stringify({ sent, failed: failures.length, failures }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    console.error("send-marketing-sms error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
