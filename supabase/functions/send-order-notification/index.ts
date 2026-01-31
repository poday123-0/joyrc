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

const getEmailContent = (type: string, orderId: string, recipientName: string, senderName: string, staffName?: string) => {
  const templates: Record<string, { subject: string; html: string }> = {
    new_order_admin: {
      subject: `New Order Received - #${orderId.slice(0, 8).toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b, #f97316); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">New Order Received! 🛒</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">A new order has been placed and requires your attention.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #6b7280;">Order ID</p>
              <p style="font-size: 18px; font-weight: bold; margin: 5px 0;">#${orderId.slice(0, 8).toUpperCase()}</p>
              <p style="margin: 10px 0 0 0; color: #6b7280;">Customer</p>
              <p style="font-size: 16px; font-weight: 500; margin: 5px 0;">${recipientName}</p>
            </div>
            <p style="font-size: 16px;">Please review the order in your admin dashboard.</p>
            <p style="font-size: 14px; color: #6b7280;">${senderName} Admin Team</p>
          </div>
        </div>
      `,
    },
    payment_confirmed: {
      subject: "Payment Confirmed - Order #" + orderId.slice(0, 8),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10B981, #06B6D4); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Payment Confirmed! ✓</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dear ${recipientName},</p>
            <p style="font-size: 16px;">Great news! Your payment has been confirmed and your order is now being processed.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #6b7280;">Order ID</p>
              <p style="font-size: 18px; font-weight: bold; margin: 5px 0;">#${orderId.slice(0, 8).toUpperCase()}</p>
            </div>
            <p style="font-size: 16px;">We'll notify you once your order has been shipped.</p>
            <p style="font-size: 14px; color: #6b7280;">Thank you for shopping with ${senderName}!</p>
          </div>
        </div>
      `,
    },
    payment_rejected: {
      subject: "Payment Issue - Order #" + orderId.slice(0, 8),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #ef4444; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Payment Issue</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dear ${recipientName},</p>
            <p style="font-size: 16px;">Unfortunately, we couldn't verify your payment for order #${orderId.slice(0, 8).toUpperCase()}.</p>
            <p style="font-size: 16px;">Please contact our support team or try uploading a clearer receipt image.</p>
            <p style="font-size: 14px; color: #6b7280;">${senderName} Support Team</p>
          </div>
        </div>
      `,
    },
    order_shipped: {
      subject: "Order Shipped - Order #" + orderId.slice(0, 8),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Your Order is On Its Way! 🚚</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dear ${recipientName},</p>
            <p style="font-size: 16px;">Your order #${orderId.slice(0, 8).toUpperCase()} has been shipped and is on its way to you!</p>
            <p style="font-size: 14px; color: #6b7280;">Thank you for shopping with ${senderName}!</p>
          </div>
        </div>
      `,
    },
    order_delivered: {
      subject: "Order Delivered - Order #" + orderId.slice(0, 8),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10B981, #06B6D4); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Order Delivered! 📦</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dear ${recipientName},</p>
            <p style="font-size: 16px;">Your order #${orderId.slice(0, 8).toUpperCase()} has been delivered!</p>
            <p style="font-size: 16px;">We hope you enjoy your purchase. If you have any questions, please don't hesitate to contact us.</p>
            <p style="font-size: 14px; color: #6b7280;">Thank you for shopping with ${senderName}!</p>
          </div>
        </div>
      `,
    },
    delivery_assigned_staff: {
      subject: "New Delivery Assignment - Order #" + orderId.slice(0, 8),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b, #f97316); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">New Delivery Assigned! 🚚</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi ${recipientName},</p>
            <p style="font-size: 16px;">A new delivery has been assigned to you.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #6b7280;">Order ID</p>
              <p style="font-size: 18px; font-weight: bold; margin: 5px 0;">#${orderId.slice(0, 8).toUpperCase()}</p>
            </div>
            <p style="font-size: 16px;">Please check your dashboard for delivery details and customer information.</p>
            <p style="font-size: 14px; color: #6b7280;">${senderName} Admin Team</p>
          </div>
        </div>
      `,
    },
    delivery_assigned_customer: {
      subject: "Order Out for Delivery - Order #" + orderId.slice(0, 8),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10B981, #06B6D4); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Your Order is Out for Delivery! 🚚</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dear ${recipientName},</p>
            <p style="font-size: 16px;">Great news! Your order #${orderId.slice(0, 8).toUpperCase()} is now out for delivery.</p>
            ${staffName ? `<p style="font-size: 16px;">Our delivery partner <strong>${staffName}</strong> will be bringing your order to you soon.</p>` : ''}
            <p style="font-size: 16px;">Please ensure someone is available to receive the package.</p>
            <p style="font-size: 14px; color: #6b7280;">Thank you for shopping with ${senderName}!</p>
          </div>
        </div>
      `,
    },
  };

  return templates[type] || templates.payment_confirmed;
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

    // Create Supabase client to fetch user emails and system settings
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get system settings for sender info
    const { data: settings } = await supabase
      .from("system_settings")
      .select("notification_email, site_name")
      .limit(1)
      .maybeSingle();

    const senderName = settings?.site_name || "RC Joy";
    const adminEmail = settings?.notification_email;
    
    // Use system notification email or fallback to resend.dev
    const fromEmail = adminEmail ? `${senderName} <${adminEmail}>` : `${senderName} <onboarding@resend.dev>`;

    console.log(`Using sender: ${fromEmail}`);

    const emailsToSend: Array<{ to: string; content: { subject: string; html: string } }> = [];

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

      emailsToSend.push({
        to: adminEmail,
        content: getEmailContent("new_order_admin", orderId, custName, senderName),
      });
    }
    // Handle delivery_assigned type - send to both staff and customer
    else if (type === "delivery_assigned") {
      // Get staff email
      if (staffUserId) {
        const { data: staffUser } = await supabase.auth.admin.getUserById(staffUserId);
        if (staffUser?.user?.email) {
          const { data: staffProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", staffUserId)
            .single();
          
          emailsToSend.push({
            to: staffUser.user.email,
            content: getEmailContent("delivery_assigned_staff", orderId, staffProfile?.full_name || staffName || "Staff", senderName),
          });
        }
      }

      // Get customer email
      if (customerUserId) {
        const { data: customerUser } = await supabase.auth.admin.getUserById(customerUserId);
        if (customerUser?.user?.email) {
          const { data: customerProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", customerUserId)
            .single();
          
          emailsToSend.push({
            to: customerUser.user.email,
            content: getEmailContent("delivery_assigned_customer", orderId, customerProfile?.full_name || customerName || "Customer", senderName, staffName),
          });
        }
      }
    } else {
      // For other notification types, send to customer
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
        emailsToSend.push({
          to: recipientEmail,
          content: getEmailContent(type, orderId, recipientName, senderName),
        });
      }
    }

    // Send all emails
    const results = [];
    for (const email of emailsToSend) {
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
      console.log(`Email sent to ${email.to}:`, emailResponse);
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
