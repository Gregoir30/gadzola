// Génère le carnet PDF du mois pour un client
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const fmtFCFA = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " FCFA";

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const year = parseInt(url.searchParams.get("year") ?? `${new Date().getFullYear()}`);
    const month = parseInt(url.searchParams.get("month") ?? `${new Date().getMonth() + 1}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: client } = await supabase
      .from("clients")
      .select("id, full_name, phone")
      .eq("profile_id", userData.user.id)
      .single();
    if (!client) {
      return new Response(JSON.stringify({ error: "Client introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 1).toISOString();

    const { data: txs } = await supabase
      .from("transactions")
      .select("amount, method, reference, created_at")
      .eq("client_id", client.id)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true });

    const total = (txs ?? []).reduce((s, t) => s + Number(t.amount), 0);

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const navy = rgb(0.07, 0.18, 0.36);
    const text = rgb(0.1, 0.1, 0.15);
    const muted = rgb(0.45, 0.5, 0.6);
    const success = rgb(0.13, 0.55, 0.4);

    // Header
    page.drawRectangle({ x: 0, y: 770, width: 595, height: 72, color: navy });
    page.drawText("GADZOLA", { x: 40, y: 805, size: 22, font: bold, color: rgb(1, 1, 1) });
    page.drawText(`Carnet d'épargne — ${MONTHS[month - 1]} ${year}`, {
      x: 40, y: 785, size: 11, font, color: rgb(0.85, 0.9, 1),
    });

    // Client info
    let y = 740;
    page.drawText("Client", { x: 40, y, size: 9, font, color: muted });
    page.drawText(client.full_name, { x: 40, y: y - 14, size: 13, font: bold, color: text });
    page.drawText(client.phone ?? "", { x: 40, y: y - 28, size: 10, font, color: muted });

    // Total mois
    page.drawRectangle({
      x: 380, y: y - 35, width: 175, height: 50,
      color: rgb(0.93, 0.97, 1),
    });
    page.drawText("Total du mois", { x: 395, y: y + 5, size: 9, font, color: muted });
    page.drawText(fmtFCFA(total), { x: 395, y: y - 18, size: 16, font: bold, color: navy });

    y -= 70;
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.5, color: muted });
    y -= 25;

    // Table header
    page.drawText("DATE", { x: 40, y, size: 8, font: bold, color: muted });
    page.drawText("RÉFÉRENCE", { x: 130, y, size: 8, font: bold, color: muted });
    page.drawText("MÉTHODE", { x: 280, y, size: 8, font: bold, color: muted });
    page.drawText("MONTANT", { x: 480, y, size: 8, font: bold, color: muted });
    y -= 6;
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.3, color: muted });
    y -= 18;

    const methodShort = (m: string) => ({
      cash: "Espèces",
      mobile_money_orange: "Orange Money",
      mobile_money_mtn: "MTN MoMo",
      mobile_money_wave: "Wave",
      mobile_money_moov: "Moov Money",
    }[m] ?? m);

    if (!txs || txs.length === 0) {
      page.drawText("Aucun paiement enregistré pour ce mois.", {
        x: 40, y, size: 11, font, color: muted,
      });
    } else {
      for (const t of txs) {
        if (y < 80) break;
        const d = new Date(t.created_at);
        page.drawText(d.toLocaleDateString("fr-FR"), { x: 40, y, size: 10, font, color: text });
        page.drawText(t.reference, { x: 130, y, size: 10, font, color: text });
        page.drawText(methodShort(t.method), { x: 280, y, size: 10, font, color: muted });
        page.drawText(fmtFCFA(Number(t.amount)), { x: 480, y, size: 10, font: bold, color: success });
        y -= 22;
      }
    }

    // Footer
    page.drawLine({ start: { x: 40, y: 60 }, end: { x: 555, y: 60 }, thickness: 0.5, color: muted });
    page.drawText(`Édité le ${new Date().toLocaleDateString("fr-FR")} • Document officiel Gadzola`, {
      x: 40, y: 45, size: 8, font, color: muted,
    });

    const bytes = await pdf.save();
    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="carnet-${year}-${String(month).padStart(2, "0")}.pdf"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
