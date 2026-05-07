import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const MESSAGEOWL_API_KEY = Deno.env.get("MESSAGEOWL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  orderId: string;
  type:
    | "payment_confirmed"
    | "order_shipped"
    | "order_delivered"
    | "payment_rejected"
    | "delivery_assigned"
    | "new_order_admin";
  customerEmail?: string;
  customerName?: string;
  customerUserId?: string;
  customerPhone?: string;
  staffUserId?: string;
  staffName?: string;
}

const typeToTemplateKey: Record<string, string> = {
  new_order_admin: "new_order_admin",
  payment_confirmed: "payment_confirmed",
  payment_rejected: "payment_rejected",
  order_shipped: "order_shipped",
  order_delivered: "order_delivered",
};

const fallbackEmail = (key: string, vars: Record<string, string>) => {
  const r = vars.customer_name || vars.staff_name || "Customer";
  const oid = vars.order_id || "";
  const sn = vars.sender_name || "RC Joy";
  const map: Record<string, { subject: string; html: string }> = {
    new_order_admin: { subject: `New Order #${oid}`, html: `<p>New order from ${r}.</p>` },
    payment_confirmed: { subject: `Payment Confirmed - #${oid}`, html: `<p>Hi ${r}, payment confirmed.</p>` },
    payment_rejected: { subject: `Payment Issue - #${oid}`, html: `<p>Hi ${r}, please contact ${sn}.</p>` },
    order_shipped: { subject: `Order Shipped - #${oid}`, html: `<p>Hi ${r}, order shipped.</p>` },
    order_delivered: { subject: `Order Delivered - #${oid}`, html: `<p>Hi ${r}, order delivered.</p>` },
    delivery_assigned_staff: { subject: `New Delivery - #${oid}`, html: `<p>Hi ${r}, delivery assigned.</p>` },
    delivery_assigned_customer: { subject: `Out for Delivery - #${oid}`, html: `<p>Hi ${r}, out for delivery.</p>` },
  };
  return map[key] || map.payment_confirmed;
};

const fallbackSms = (key: string, vars: Record<string, string>) => {
  const r = vars.customer_name || vars.staff_name || "Customer";
  const oid = vars.order_id || "";
  const map: Record<string, string> = {
    new_order_admin: `New order #${oid} from ${r}.`,
    payment_confirmed: `Hi ${r}, payment for order #${oid} confirmed.`,
    payment_rejected: `Hi ${r}, payment issue with order #${oid}.`,
    order_shipped: `Hi ${r}, your order #${oid} has been shipped.`,
    order_delivered: `Hi ${r}, your order #${oid} has been delivered.`,
    delivery_assigned_staff: `Hi ${r}, new delivery assigned: order #${oid}.`,
    delivery_assigned_customer: `Hi ${r}, order #${oid} is out for delivery.`,
  };
  return map[key] || `Order #${oid} update.`;
};

const replaceVars = (tpl: string, vars: Record<string, string>) => {
  let r = tpl;
  for (const [k, v] of Object.entries(vars)) {
    r = r.replace(new RegExp(`{{${k}}}`, "g"), v || "");
  }
  return r;
};

function normalizePhone(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("960") ? digits : `960${digits}`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: NotificationRequest = await req.json();
    const { orderId, type, customerEmail, customerName, customerUserId, customerPhone, staffUserId, staffName } = body;

    if (!orderId || !type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { data: settings } = await supabase
      .from("system_settings")
      .select("notification_email, notification_phone, notification_sender_name, site_name, sms_sender_id")
      .limit(1).maybeSingle();

    const senderName = settings?.notification_sender_name || settings?.site_name || "RC Joy";
    const adminEmail = settings?.notification_email;
    const adminPhone = settings?.notification_phone;
    const fromEmail = adminEmail ? `${senderName} <${adminEmail}>` : `${senderName} <onboarding@resend.dev>`;
    const smsSender = settings?.sms_sender_id || "RCJOY";

    const { data: smsCred } = await supabase.from("sms_credentials").select("api_key").limit(1).maybeSingle();
    const smsApiKey = smsCred?.api_key || MESSAGEOWL_API_KEY || "";

    const shortOrderId = orderId.slice(0, 8).toUpperCase();

    // Build dispatch list: { templateKey, vars, email?, phone? }
    type Job = { templateKey: string; vars: Record<string, string>; email?: string; phone?: string };
    const jobs: Job[] = [];

    const fetchProfile = async (uid: string) => {
      const { data: profile } = await supabase.from("profiles").select("full_name, mobile_number").eq("user_id", uid).single();
      const { data: u } = await supabase.auth.admin.getUserById(uid);
      return { name: profile?.full_name, phone: profile?.mobile_number, email: u?.user?.email };
    };

    if (type === "new_order_admin") {
      let custName = customerName || "Customer";
      if (!customerName && customerUserId) {
        const p = await fetchProfile(customerUserId);
        custName = p.name || "Customer";
      }
      jobs.push({
        templateKey: "new_order_admin",
        vars: { order_id: shortOrderId, customer_name: custName, customer_email: customerEmail || "", sender_name: senderName },
        email: adminEmail || undefined,
        phone: adminPhone || undefined,
      });
    } else if (type === "delivery_assigned") {
      if (staffUserId) {
        const p = await fetchProfile(staffUserId);
        const sName = p.name || staffName || "Staff";
        jobs.push({
          templateKey: "delivery_assigned_staff",
          vars: { order_id: shortOrderId, staff_name: sName, sender_name: senderName },
          email: p.email,
          phone: p.phone || undefined,
        });
      }
      if (customerUserId) {
        const p = await fetchProfile(customerUserId);
        const cName = p.name || customerName || "Customer";
        jobs.push({
          templateKey: "delivery_assigned_customer",
          vars: { order_id: shortOrderId, customer_name: cName, staff_name: staffName || "our delivery partner", sender_name: senderName },
          email: p.email,
          phone: p.phone || customerPhone || undefined,
        });
      }
    } else {
      let email = customerEmail;
      let name = customerName || "Customer";
      let phone = customerPhone;
      if (customerUserId) {
        const p = await fetchProfile(customerUserId);
        email = email || p.email;
        if (!customerName) name = p.name || name;
        phone = phone || p.phone || undefined;
      }
      jobs.push({
        templateKey: typeToTemplateKey[type] || type,
        vars: { order_id: shortOrderId, customer_name: name, sender_name: senderName },
        email, phone,
      });
    }

    const results: any[] = [];
    for (const job of jobs) {
      const { data: tpl } = await supabase
        .from("email_templates")
        .select("subject, html_content, sms_content, send_email, send_sms, is_active")
        .eq("template_key", job.templateKey)
        .maybeSingle();

      if (!tpl?.is_active && tpl) {
        results.push({ templateKey: job.templateKey, skipped: "template disabled" });
        continue;
      }

      const sendEmail = tpl?.send_email !== false; // default true if no template
      const sendSms = tpl?.send_sms === true;

      // Email
      if (sendEmail && job.email && RESEND_API_KEY) {
        const fb = fallbackEmail(job.templateKey, job.vars);
        const subject = replaceVars(tpl?.subject || fb.subject, job.vars);
        const html = replaceVars(tpl?.html_content || fb.html, job.vars);
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({ from: fromEmail, to: [job.email], subject, html }),
          });
          results.push({ channel: "email", to: job.email, success: res.ok, response: await res.json() });
        } catch (e: any) {
          results.push({ channel: "email", to: job.email, success: false, error: e.message });
        }
      }

      // SMS
      if (sendSms && job.phone && smsApiKey) {
        const smsBody = replaceVars(tpl?.sms_content || fallbackSms(job.templateKey, job.vars), job.vars);
        const to = normalizePhone(job.phone);
        if (to) {
          try {
            const res = await fetch("https://rest.msgowl.com/messages", {
              method: "POST",
              headers: { Authorization: `AccessKey ${smsApiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ recipients: to, sender_id: smsSender, body: smsBody }),
            });
            const text = await res.text();
            results.push({ channel: "sms", to, success: res.ok, response: text });
          } catch (e: any) {
            results.push({ channel: "sms", to, success: false, error: e.message });
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-order-notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
