import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check caller's role (admin or super_admin)
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id);

    const callerIsSuperAdmin = callerRoles?.some(r => r.role === "super_admin");
    const callerIsAdmin = callerRoles?.some(r => r.role === "admin" || r.role === "super_admin");

    if (!callerIsAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can manage users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { action, user_id, new_password } = await req.json();

    if (!action || !user_id) {
      return new Response(
        JSON.stringify({ error: "Action and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check target user's role
    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id);

    const targetIsSuperAdmin = targetRoles?.some(r => r.role === "super_admin");
    const targetIsAdmin = targetRoles?.some(r => r.role === "admin");

    // Prevent admin from deleting themselves
    if (action === "delete" && user_id === callerUser.id) {
      return new Response(
        JSON.stringify({ error: "You cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Super admin protection: no one can delete super admin
    if (action === "delete" && targetIsSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Super admin cannot be deleted" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only super admin can delete other admins
    if (action === "delete" && targetIsAdmin && !callerIsSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Only super admin can delete other admins" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      // Delete user completely from auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      
      if (deleteError) {
        console.error("Error deleting user:", deleteError);
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Also clean up profiles and roles (in case cascade didn't work)
      await supabaseAdmin.from("profiles").delete().eq("user_id", user_id);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);

      return new Response(
        JSON.stringify({ success: true, message: "User deleted successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reset_password") {
      const password = new_password || "123456";
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: password,
      });
      
      if (updateError) {
        console.error("Error resetting password:", updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: `Password reset to: ${password}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Promote admin to super_admin (only super_admin can do this)
    if (action === "promote_to_super_admin") {
      if (!callerIsSuperAdmin) {
        return new Response(
          JSON.stringify({ error: "Only super admin can promote others to super admin" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Remove existing admin role and add super_admin
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
      
      const { error: insertError } = await supabaseAdmin.from("user_roles").upsert({
        user_id: user_id,
        role: "super_admin",
      }, { onConflict: "user_id,role" });

      if (insertError) {
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "User promoted to super admin" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Demote self from super_admin to admin (super_admin can demote themselves)
    if (action === "demote_self") {
      if (!callerIsSuperAdmin) {
        return new Response(
          JSON.stringify({ error: "Only super admin can demote themselves" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (user_id !== callerUser.id) {
        return new Response(
          JSON.stringify({ error: "You can only demote yourself" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if there's at least one other super_admin
      const { data: allSuperAdmins } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");

      if (!allSuperAdmins || allSuperAdmins.length <= 1) {
        return new Response(
          JSON.stringify({ error: "Cannot demote: You must promote another admin to super admin first" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Remove super_admin role and add admin role
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id).eq("role", "super_admin");
      
      const { error: insertError } = await supabaseAdmin.from("user_roles").insert({
        user_id: user_id,
        role: "admin",
      });

      if (insertError) {
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "You have been demoted to admin" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remove admin role (only super_admin can do this)
    if (action === "remove_admin") {
      if (!callerIsSuperAdmin) {
        return new Response(
          JSON.stringify({ error: "Only super admin can remove admin privileges" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (targetIsSuperAdmin) {
        return new Response(
          JSON.stringify({ error: "Cannot remove super admin privileges this way. Super admin must demote themselves first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .eq("role", "admin");

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Admin privileges removed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'delete', 'reset_password', 'promote_to_super_admin', 'demote_self', or 'remove_admin'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error managing user:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});