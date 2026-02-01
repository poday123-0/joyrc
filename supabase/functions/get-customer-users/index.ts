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

    // Get search query from URL params
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get("q")?.toLowerCase() || "";
    const limit = parseInt(url.searchParams.get("limit") || "20");

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
        JSON.stringify({ error: "Only admins can view customer users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all admin/super_admin role user IDs to exclude them
    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .or("role.eq.admin,role.eq.super_admin");

    const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

    // Build the profile query with optional search
    let profilesQuery = supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // Apply server-side filtering if search query provided
    if (searchQuery) {
      profilesQuery = profilesQuery.or(`full_name.ilike.%${searchQuery}%,mobile_number.ilike.%${searchQuery}%`);
    }

    const { data: profiles, error: profilesError } = await profilesQuery.limit(limit * 2); // Get extra to account for admin filtering

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to only customers (non-admin users) and limit
    const customerProfiles = (profiles || [])
      .filter(p => !adminUserIds.has(p.user_id))
      .slice(0, limit);

    // Only fetch auth users if we have profiles to match
    let customersWithEmail = customerProfiles.map(profile => ({
      ...profile,
      email: null as string | null,
    }));

    if (customerProfiles.length > 0) {
      // Get emails from auth.users using admin API
      const { data: { users: authUsers }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000,
      });

      if (!usersError && authUsers) {
        const userEmailMap = new Map(authUsers.map(u => [u.id, u.email]));
        customersWithEmail = customerProfiles.map(profile => ({
          ...profile,
          email: userEmailMap.get(profile.user_id) || null,
        }));
      }
    }

    console.log(`Fetched ${customersWithEmail.length} customer users (query: "${searchQuery}")`);

    return new Response(
      JSON.stringify({ customers: customersWithEmail }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error fetching customer users:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
