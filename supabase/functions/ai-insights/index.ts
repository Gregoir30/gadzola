// Génère des insights financiers personnalisés via Lovable AI Gateway
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Récupérer le client
    const { data: client } = await supabase
      .from("clients")
      .select("id, full_name, balance")
      .eq("profile_id", userData.user.id)
      .single();

    if (!client) {
      return new Response(JSON.stringify({ error: "Client introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transactions des 90 derniers jours
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const { data: txs } = await supabase
      .from("transactions")
      .select("amount, method, created_at")
      .eq("client_id", client.id)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    const total = (txs ?? []).reduce((s, t) => s + Number(t.amount), 0);
    const count = txs?.length ?? 0;
    const avg = count > 0 ? total / count : 0;

    // Mois en cours
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTxs = (txs ?? []).filter((t) => new Date(t.created_at) >= monthStart);
    const monthTotal = monthTxs.reduce((s, t) => s + Number(t.amount), 0);

    // Objectif du mois
    const { data: goal } = await supabase
      .from("client_goals")
      .select("target_amount")
      .eq("client_id", client.id)
      .eq("year", now.getFullYear())
      .eq("month", now.getMonth() + 1)
      .maybeSingle();

    const summary = {
      nom: client.full_name,
      solde_total_FCFA: Number(client.balance),
      transactions_90j: count,
      total_90j_FCFA: total,
      moyenne_par_paiement_FCFA: Math.round(avg),
      total_mois_en_cours_FCFA: monthTotal,
      objectif_mois_FCFA: goal?.target_amount ? Number(goal.target_amount) : null,
    };

    const prompt = `Tu es un coach financier bienveillant pour un client africain (FCFA).
Données du client :
${JSON.stringify(summary, null, 2)}

Génère un message court (3-4 phrases max), chaleureux, motivant et personnalisé en français.
Inclus :
- Une observation sur ses habitudes de paiement
- Un encouragement concret
- Si objectif défini, indique sa progression et donne une projection à fin de mois
Style : amical, simple, sans jargon. Pas d'introduction, va droit au but.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      return new Response(
        JSON.stringify({ error: "AI gateway error", detail: txt }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiResp.json();
    const insight = aiJson.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ insight, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
