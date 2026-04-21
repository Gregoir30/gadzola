import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreateUserBody {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: "collecteur" | "client";
}

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

    // Client utilisé pour vérifier l'identité de l'appelant
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) return json({ error: "Session invalide" }, 401);

    // Vérifier que l'appelant est admin
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roleRows || roleRows.length === 0) {
      return json({ error: "Accès refusé : admin requis" }, 403);
    }

    const body = (await req.json()) as CreateUserBody;
    if (!body.email || !body.password || !body.full_name || !body.role) {
      return json({ error: "Champs manquants" }, 400);
    }
    if (!["collecteur", "client"].includes(body.role)) {
      return json({ error: "Rôle invalide" }, 400);
    }
    if (body.password.length < 8) {
      return json({ error: "Mot de passe trop court (min 8)" }, 400);
    }

    // Création du compte
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name, phone: body.phone ?? null },
    });

    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "Erreur création" }, 400);
    }

    const newUserId = created.user.id;

    // Mettre à jour le profil avec phone si pas pris par le trigger
    await admin
      .from("profiles")
      .update({ full_name: body.full_name, phone: body.phone ?? null, email: body.email })
      .eq("id", newUserId);

    // Attribuer le rôle
    await admin.from("user_roles").insert({ user_id: newUserId, role: body.role });

    // Si client, créer la fiche client
    if (body.role === "client") {
      await admin.from("clients").insert({
        profile_id: newUserId,
        full_name: body.full_name,
        phone: body.phone ?? null,
        created_by: user.id,
      });
    }

    return json({ success: true, user_id: newUserId });
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
