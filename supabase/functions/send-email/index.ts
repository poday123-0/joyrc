import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendEmailRequest {
  type: "order_notification" | "order_update" | "marketing" | "admin_notification" | "new_contact_message" | "customer_reply_notification";
  template_key?: string;
  order_id?: string;
  recipient_email?: string;
  recipient_emails?: string[];
  subject?: string;
  html_content?: string;
  variables?: Record<string, string>;
  // For contact message notifications
  customer_name?: string;
  customer_email?: string;
  customer_mobile?: string;
  message?: string;
  reply_text?: string;
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
      .select("notification_email, site_name")
      .limit(1)
      .maybeSingle();

    // Use site_name as the sender name for all emails
    const senderName = settings?.site_name || "RC Joy";
    const adminEmail = settings?.notification_email;
    
    // Use verified domain email or fallback to resend.dev
    const fromEmail = adminEmail ? `${senderName} <${adminEmail}>` : `${senderName} <onboarding@resend.dev>`;

    // Handle new contact message notification (to admin)
    if (body.type === "new_contact_message") {
      if (!adminEmail) {
        console.log("No admin email configured, skipping notification");
        return new Response(
          JSON.stringify({ success: false, message: "No admin email configured" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Contact Message</h2>
          <p>You have received a new message from the support form:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${body.customer_name}</p>
            <p><strong>Mobile:</strong> ${body.customer_mobile}</p>
            ${body.customer_email ? `<p><strong>Email:</strong> ${body.customer_email}</p>` : ''}
            <p><strong>Subject:</strong> ${body.subject}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${body.message}</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Reply to this message from your admin dashboard.
          </p>
        </div>
      `;

      console.log(`Sending new contact message notification to ${adminEmail}`);

      const emailResult = await resend.emails.send({
        from: fromEmail,
        to: [adminEmail],
        subject: `New Contact: ${body.subject}`,
        html: htmlContent,
      });

      console.log("Admin notification sent:", emailResult);
      return new Response(
        JSON.stringify({ success: true, result: emailResult }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle customer reply notification (when admin replies)
    if (body.type === "customer_reply_notification") {
      if (!body.recipient_email) {
        console.log("No customer email provided, skipping notification");
        return new Response(
          JSON.stringify({ success: false, message: "No customer email provided" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reply to Your Message</h2>
          <p>Hi ${body.customer_name || 'there'},</p>
          <p>We have replied to your message regarding: <strong>${body.subject}</strong></p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
            <p style="white-space: pre-wrap; margin: 0;">${body.reply_text}</p>
          </div>
          
          <p>If you have any further questions, feel free to reply through our support page.</p>
          
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            ${senderName} Support Team
          </p>
        </div>
      `;

      console.log(`Sending reply notification to customer: ${body.recipient_email}`);

      const emailResult = await resend.emails.send({
        from: fromEmail,
        to: [body.recipient_email],
        subject: `Re: ${body.subject} - ${senderName}`,
        html: htmlContent,
      });

      console.log("Customer notification sent:", emailResult);
      return new Response(
        JSON.stringify({ success: true, result: emailResult }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
            from: fromEmail,
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

    // For admin notifications (like new product updates), send to admin email
    if (body.type === "admin_notification") {
      if (!adminEmail) {
        console.log("No admin email configured, skipping admin notification");
        return new Response(
          JSON.stringify({ success: false, message: "No admin email configured" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      recipientEmail = adminEmail;
    }

    if (!recipientEmail) {
      throw new Error("No recipient email available");
    }

    // Replace variables in template
    const subject = replaceVariables(template.subject, variables);
    const htmlContent = replaceVariables(template.html_content, variables);

    console.log(`Sending email to ${recipientEmail}: ${subject}`);

    const emailResult = await resend.emails.send({
      from: fromEmail,
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
