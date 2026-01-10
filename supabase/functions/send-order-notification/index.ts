import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  orderId: string;
  type: "payment_confirmed" | "order_shipped" | "order_delivered" | "payment_rejected";
  customerEmail: string;
  customerName?: string;
}

const getEmailContent = (type: string, orderId: string, customerName: string) => {
  const templates: Record<string, { subject: string; html: string }> = {
    payment_confirmed: {
      subject: "Payment Confirmed - Order #" + orderId.slice(0, 8),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10B981, #06B6D4); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Payment Confirmed! ✓</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dear ${customerName},</p>
            <p style="font-size: 16px;">Great news! Your payment has been confirmed and your order is now being processed.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #6b7280;">Order ID</p>
              <p style="font-size: 18px; font-weight: bold; margin: 5px 0;">#${orderId.slice(0, 8).toUpperCase()}</p>
            </div>
            <p style="font-size: 16px;">We'll notify you once your order has been shipped.</p>
            <p style="font-size: 14px; color: #6b7280;">Thank you for shopping with RC Joy!</p>
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
            <p style="font-size: 16px;">Dear ${customerName},</p>
            <p style="font-size: 16px;">Unfortunately, we couldn't verify your payment for order #${orderId.slice(0, 8).toUpperCase()}.</p>
            <p style="font-size: 16px;">Please contact our support team or try uploading a clearer receipt image.</p>
            <p style="font-size: 14px; color: #6b7280;">RC Joy Support Team</p>
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
            <p style="font-size: 16px;">Dear ${customerName},</p>
            <p style="font-size: 16px;">Your order #${orderId.slice(0, 8).toUpperCase()} has been shipped and is on its way to you!</p>
            <p style="font-size: 14px; color: #6b7280;">Thank you for shopping with RC Joy!</p>
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
            <p style="font-size: 16px;">Dear ${customerName},</p>
            <p style="font-size: 16px;">Your order #${orderId.slice(0, 8).toUpperCase()} has been delivered!</p>
            <p style="font-size: 16px;">We hope you enjoy your purchase. If you have any questions, please don't hesitate to contact us.</p>
            <p style="font-size: 14px; color: #6b7280;">Thank you for shopping with RC Joy!</p>
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

    const { orderId, type, customerEmail, customerName }: NotificationRequest = await req.json();

    if (!orderId || !type || !customerEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailContent = getEmailContent(type, orderId, customerName || "Customer");

    // Send email using Resend API directly
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "RC Joy <onboarding@resend.dev>",
        to: [customerEmail],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    const emailResponse = await res.json();

    if (!res.ok) {
      throw new Error(emailResponse.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
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
