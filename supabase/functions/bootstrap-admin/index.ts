import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Non authentifié" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Session invalide" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { count, error: countError } = await admin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (countError) {
      return json({ error: countError.message }, 500);
    }

    if ((count ?? 0) > 0) {
      const { data: currentRoles, error: roleError } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");

      if (roleError) {
        return json({ error: roleError.message }, 500);
      }

      return json({ assigned: (currentRoles?.length ?? 0) > 0, already_exists: true });
    }

    const fullName = (user.user_metadata?.full_name as string | undefined) ?? "";
    const phone = (user.user_metadata?.phone as string | undefined) ?? null;

    const { error: profileError } = await admin.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      email: user.email ?? null,
      phone,
    });

    if (profileError) {
      return json({ error: profileError.message }, 500);
    }

    const { error: insertError } = await admin.from("user_roles").insert({
      user_id: user.id,
      role: "admin",
    });

    if (insertError) {
      return json({ error: insertError.message }, 500);
    }

    return json({ assigned: true, already_exists: false, role: "admin" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return json({ error: msg }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
