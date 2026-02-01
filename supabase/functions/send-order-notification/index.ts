import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  orderId: string;
  type: "payment_confirmed" | "order_shipped" | "order_delivered" | "payment_rejected" | "delivery_assigned" | "new_order_admin";
  customerEmail?: string;
  customerName?: string;
  customerUserId?: string;
  staffUserId?: string;
  staffName?: string;
}

// Map notification types to template keys
const typeToTemplateKey: Record<string, string> = {
  new_order_admin: "new_order_admin",
  payment_confirmed: "payment_confirmed",
  payment_rejected: "payment_rejected",
  order_shipped: "order_shipped",
  order_delivered: "order_delivered",
  delivery_assigned_staff: "delivery_assigned_staff",
  delivery_assigned_customer: "delivery_assigned_customer",
};

// Fallback templates in case database template is not found
const getFallbackTemplate = (type: string, orderId: string, recipientName: string, senderName: string, staffName?: string) => {
  const templates: Record<string, { subject: string; html: string }> = {
    new_order_admin: {
      subject: `New Order Received - #${orderId}`,
      html: `<div style="font-family: Arial, sans-serif;"><h1>New Order Received! 🛒</h1><p>A new order has been placed.</p><p>Order ID: #${orderId}</p><p>Customer: ${recipientName}</p><p>${senderName} Admin Team</p></div>`,
    },
    payment_confirmed: {
      subject: `Payment Confirmed - Order #${orderId}`,
      html: `<div style="font-family: Arial, sans-serif;"><h1>Payment Confirmed! ✓</h1><p>Dear ${recipientName},</p><p>Your payment has been confirmed and your order is being processed.</p><p>Order ID: #${orderId}</p><p>Thank you for shopping with ${senderName}!</p></div>`,
    },
    payment_rejected: {
      subject: `Payment Issue - Order #${orderId}`,
      html: `<div style="font-family: Arial, sans-serif;"><h1>Payment Issue</h1><p>Dear ${recipientName},</p><p>We couldn't verify your payment for order #${orderId}.</p><p>Please contact our support team.</p><p>${senderName} Support Team</p></div>`,
    },
    order_shipped: {
      subject: `Order Shipped - Order #${orderId}`,
      html: `<div style="font-family: Arial, sans-serif;"><h1>Your Order is On Its Way! 🚚</h1><p>Dear ${recipientName},</p><p>Your order #${orderId} has been shipped!</p><p>Thank you for shopping with ${senderName}!</p></div>`,
    },
    order_delivered: {
      subject: `Order Delivered - Order #${orderId}`,
      html: `<div style="font-family: Arial, sans-serif;"><h1>Order Delivered! 📦</h1><p>Dear ${recipientName},</p><p>Your order #${orderId} has been delivered!</p><p>Thank you for shopping with ${senderName}!</p></div>`,
    },
    delivery_assigned_staff: {
      subject: `New Delivery Assignment - Order #${orderId}`,
      html: `<div style="font-family: Arial, sans-serif;"><h1>New Delivery Assigned! 🚚</h1><p>Hi ${recipientName},</p><p>A new delivery has been assigned to you.</p><p>Order ID: #${orderId}</p><p>${senderName} Admin Team</p></div>`,
    },
    delivery_assigned_customer: {
      subject: `Order Out for Delivery - Order #${orderId}`,
      html: `<div style="font-family: Arial, sans-serif;"><h1>Your Order is Out for Delivery! 🚚</h1><p>Dear ${recipientName},</p><p>Your order #${orderId} is now out for delivery.</p>${staffName ? `<p>Delivery partner: ${staffName}</p>` : ''}<p>Thank you for shopping with ${senderName}!</p></div>`,
    },
  };

  return templates[type] || templates.payment_confirmed;
};

// Replace template variables with actual values
const replaceVariables = (template: string, variables: Record<string, string>): string => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const body: NotificationRequest = await req.json();
    const { orderId, type, customerEmail, customerName, customerUserId, staffUserId, staffName } = body;

    if (!orderId || !type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing ${type} notification for order ${orderId}`);

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get system settings for sender info
    const { data: settings } = await supabase
      .from("system_settings")
      .select("notification_email, notification_sender_name, site_name")
      .limit(1)
      .maybeSingle();

    const senderName = settings?.notification_sender_name || settings?.site_name || "RC Joy";
    const adminEmail = settings?.notification_email;
    const fromEmail = adminEmail ? `${senderName} <${adminEmail}>` : `${senderName} <onboarding@resend.dev>`;

    console.log(`Using sender: ${fromEmail}`);

    // Helper function to get email content from database template
    const getEmailContent = async (
      templateKey: string, 
      variables: Record<string, string>,
      fallbackRecipientName: string,
      fallbackStaffName?: string
    ): Promise<{ subject: string; html: string }> => {
      // Fetch template from database
      const { data: template, error } = await supabase
        .from("email_templates")
        .select("subject, html_content")
        .eq("template_key", templateKey)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !template) {
        console.log(`Template '${templateKey}' not found in database, using fallback`);
        return getFallbackTemplate(
          templateKey, 
          variables.order_id || orderId.slice(0, 8).toUpperCase(), 
          fallbackRecipientName, 
          senderName,
          fallbackStaffName
        );
      }

      // Replace variables in template
      const subject = replaceVariables(template.subject, variables);
      const html = replaceVariables(template.html_content, variables);

      return { subject, html };
    };

    const emailsToSend: Array<{ to: string; content: { subject: string; html: string } }> = [];
    const shortOrderId = orderId.slice(0, 8).toUpperCase();

    // Handle new order admin notification
    if (type === "new_order_admin") {
      if (!adminEmail) {
        console.log("No admin email configured, skipping admin notification");
        return new Response(
          JSON.stringify({ success: false, message: "No admin email configured" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      let custName = customerName || "Customer";
      if (!customerName && customerUserId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", customerUserId)
          .single();
        custName = profile?.full_name || "Customer";
      }

      const variables = {
        order_id: shortOrderId,
        customer_name: custName,
        customer_email: customerEmail || "",
        sender_name: senderName,
      };

      const content = await getEmailContent("new_order_admin", variables, custName);
      emailsToSend.push({ to: adminEmail, content });
    }
    // Handle delivery_assigned type - send to both staff and customer
    else if (type === "delivery_assigned") {
      // Get staff email and send notification
      if (staffUserId) {
        const { data: staffUser } = await supabase.auth.admin.getUserById(staffUserId);
        if (staffUser?.user?.email) {
          const { data: staffProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", staffUserId)
            .single();
          
          const staffFullName = staffProfile?.full_name || staffName || "Staff";
          const variables = {
            order_id: shortOrderId,
            staff_name: staffFullName,
            sender_name: senderName,
          };

          const content = await getEmailContent("delivery_assigned_staff", variables, staffFullName);
          emailsToSend.push({ to: staffUser.user.email, content });
        }
      }

      // Get customer email and send notification
      if (customerUserId) {
        const { data: customerUser } = await supabase.auth.admin.getUserById(customerUserId);
        if (customerUser?.user?.email) {
          const { data: customerProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", customerUserId)
            .single();
          
          const custName = customerProfile?.full_name || customerName || "Customer";
          const variables = {
            order_id: shortOrderId,
            customer_name: custName,
            staff_name: staffName || "our delivery partner",
            sender_name: senderName,
          };

          const content = await getEmailContent("delivery_assigned_customer", variables, custName, staffName);
          emailsToSend.push({ to: customerUser.user.email, content });
        }
      }
    } else {
      // For other notification types (payment_confirmed, payment_rejected, order_shipped, order_delivered)
      let recipientEmail = customerEmail;
      let recipientName = customerName || "Customer";

      if (!recipientEmail && customerUserId) {
        const { data: user } = await supabase.auth.admin.getUserById(customerUserId);
        recipientEmail = user?.user?.email;
        
        if (!customerName) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", customerUserId)
            .single();
          recipientName = profile?.full_name || "Customer";
        }
      }

      if (recipientEmail) {
        const templateKey = typeToTemplateKey[type] || type;
        const variables = {
          order_id: shortOrderId,
          customer_name: recipientName,
          sender_name: senderName,
        };

        const content = await getEmailContent(templateKey, variables, recipientName);
        emailsToSend.push({ to: recipientEmail, content });
      }
    }

    if (emailsToSend.length === 0) {
      console.log("No emails to send - no valid recipients found");
      return new Response(
        JSON.stringify({ success: false, message: "No valid recipients found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send all emails
    const results = [];
    for (const email of emailsToSend) {
      console.log(`Sending email to ${email.to}: ${email.content.subject}`);
      
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email.to],
          subject: email.content.subject,
          html: email.content.html,
        }),
      });

      const emailResponse = await res.json();
      console.log(`Email result for ${email.to}:`, emailResponse);
      results.push({ to: email.to, response: emailResponse, success: res.ok });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-order-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
