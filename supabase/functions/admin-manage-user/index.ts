import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ManageUserBody {
  action: "UPDATE" | "DELETE" | "TOGGLE_SUSPEND";
  userId: string;
  payload?: {
    full_name?: string;
    phone?: string;
    is_suspended?: boolean;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth header" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roleRows || roleRows.length === 0) {
      return json({ error: "Unauthorized: admin only" }, 403);
    }

    const { action, userId, payload } = (await req.json()) as ManageUserBody;

    if (action === "UPDATE" && payload) {
      // Update Profile
      const { error: profileErr } = await admin
        .from("profiles")
        .update({ 
          full_name: payload.full_name, 
          phone: payload.phone 
        })
        .eq("id", userId);
      
      // Update Auth Metadata
      const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
        user_metadata: { full_name: payload.full_name, phone: payload.phone }
      });

      if (profileErr || authErr) throw profileErr || authErr;
      return json({ success: true });
    }

    if (action === "TOGGLE_SUSPEND" && payload) {
      const { error } = await admin
        .from("profiles")
        .update({ is_suspended: payload.is_suspended })
        .eq("id", userId);
      
      // Also update Auth metadata to track status
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: { is_suspended: payload.is_suspended }
      });

      if (error) throw error;
      return json({ success: true });
    }

    if (action === "DELETE") {
      // Safety Check: Check for transactions
      const { count } = await admin
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .or(`collector_id.eq.${userId},client_id.eq.${userId}`);

      if (count && count > 0) {
        return json({ error: "Cannot delete user with transaction history. Freeze instead." }, 400);
      }

      // Proceed with deletion if safe
      const { error: authErr } = await admin.auth.admin.deleteUser(userId);
      if (authErr) throw authErr;

      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
