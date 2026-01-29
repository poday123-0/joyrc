import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendEmailRequest {
  type: "order_notification" | "order_update" | "marketing";
  template_key?: string;
  order_id?: string;
  recipient_email?: string;
  recipient_emails?: string[];
  subject?: string;
  html_content?: string;
  variables?: Record<string, string>;
}

// Replace variables in template
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, value);
  }
  return result;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SendEmailRequest = await req.json();
    console.log("Email request received:", { type: body.type, template_key: body.template_key });

    // Get system settings for sender info
    const { data: settings } = await supabase
      .from("system_settings")
      .select("notification_email, notification_sender_name, site_name")
      .limit(1)
      .maybeSingle();

    const senderName = settings?.notification_sender_name || settings?.site_name || "RC Joy";
    const adminEmail = settings?.notification_email;

    // For marketing emails - send to multiple recipients
    if (body.type === "marketing") {
      if (!body.recipient_emails || body.recipient_emails.length === 0) {
        throw new Error("No recipients specified for marketing email");
      }
      if (!body.subject || !body.html_content) {
        throw new Error("Subject and content required for marketing email");
      }

      console.log(`Sending marketing email to ${body.recipient_emails.length} recipients`);

      // Send emails in batches
      const results = [];
      for (const email of body.recipient_emails) {
        try {
          const result = await resend.emails.send({
            from: `${senderName} <onboarding@resend.dev>`,
            to: [email],
            subject: body.subject,
            html: body.html_content,
          });
          results.push({ email, success: true, result });
        } catch (err) {
          console.error(`Failed to send to ${email}:`, err);
          results.push({ email, success: false, error: String(err) });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`Marketing email sent: ${successCount}/${body.recipient_emails.length} successful`);

      return new Response(
        JSON.stringify({ success: true, sent: successCount, total: body.recipient_emails.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get email template
    if (!body.template_key) {
      throw new Error("Template key is required");
    }

    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("template_key", body.template_key)
      .eq("is_active", true)
      .maybeSingle();

    if (templateError || !template) {
      console.error("Template not found:", body.template_key, templateError);
      throw new Error(`Email template '${body.template_key}' not found`);
    }

    // For order notifications - get order details
    let variables = body.variables || {};
    let recipientEmail = body.recipient_email;

    if (body.order_id) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("id", body.order_id)
        .maybeSingle();

      if (orderError || !order) {
        console.error("Order not found:", body.order_id, orderError);
        throw new Error("Order not found");
      }

      // Get customer info
      const { data: userData } = await supabase.auth.admin.getUserById(order.user_id);
      const customerEmail = userData?.user?.email || "";
      const customerName = userData?.user?.user_metadata?.full_name || "Customer";

      // Build order items HTML
      const orderItemsHtml = order.order_items
        .map((item: any) => `<li>${item.product_name} x${item.quantity} - MVR ${item.product_price}</li>`)
        .join("");

      variables = {
        ...variables,
        order_id: order.id.substring(0, 8).toUpperCase(),
        customer_name: customerName,
        customer_email: customerEmail,
        order_total: `MVR ${order.total_amount.toFixed(2)}`,
        order_items: `<ul>${orderItemsHtml}</ul>`,
        order_status: order.status,
        shipping_address: order.shipping_address || "Not provided",
        phone: order.phone || "Not provided",
      };

      // Set recipient based on notification type
      if (body.type === "order_notification" && body.template_key === "new_order_admin") {
        // Admin notification
        if (!adminEmail) {
          console.log("No admin email configured, skipping admin notification");
          return new Response(
            JSON.stringify({ success: false, message: "No admin email configured" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        recipientEmail = adminEmail;
      } else {
        // Customer notification
        recipientEmail = customerEmail;
      }
    }

    if (!recipientEmail) {
      throw new Error("No recipient email available");
    }

    // Replace variables in template
    const subject = replaceVariables(template.subject, variables);
    const htmlContent = replaceVariables(template.html_content, variables);

    console.log(`Sending email to ${recipientEmail}: ${subject}`);

    const emailResult = await resend.emails.send({
      from: `${senderName} <onboarding@resend.dev>`,
      to: [recipientEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, result: emailResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
