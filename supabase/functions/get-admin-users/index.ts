import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
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

    // Check if caller is admin or super_admin
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id);

    const isAdmin = callerRoles?.some(r => r.role === "admin" || r.role === "super_admin");

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can view admin users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all admin and super_admin roles
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("*")
      .or("role.eq.admin,role.eq.super_admin");

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
      return new Response(
        JSON.stringify({ error: rolesError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ admins: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get profiles for these users
    const userIds = roles.map(r => r.user_id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    // Get emails from auth.users using admin API
    const { data: { users: authUsers }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error("Error fetching auth users:", usersError);
    }

    // Combine data
    const adminsWithInfo = roles.map(role => {
      const profile = profiles?.find(p => p.user_id === role.user_id);
      const authUser = authUsers?.find(u => u.id === role.user_id);
      
      return {
        id: role.id,
        user_id: role.user_id,
        role: role.role,
        created_at: role.created_at,
        full_name: profile?.full_name || "Unknown",
        email: authUser?.email || "No email",
      };
    });

    console.log(`Fetched ${adminsWithInfo.length} admin users`);

    return new Response(
      JSON.stringify({ admins: adminsWithInfo }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error fetching admin users:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});