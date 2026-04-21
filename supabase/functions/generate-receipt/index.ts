// Génère un reçu PDF pour une transaction
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const methodLabel = (m: string) => ({
  cash: "Espèces",
  mobile_money_orange: "Orange Money",
  mobile_money_mtn: "MTN Mobile Money",
  mobile_money_wave: "Wave",
  mobile_money_moov: "Moov Money",
}[m] ?? m);

const fmtFCFA = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " FCFA";

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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

    const { transactionId } = await req.json();
    if (!transactionId) {
      return new Response(JSON.stringify({ error: "transactionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: tx, error } = await supabase
      .from("transactions")
      .select("id, amount, method, reference, created_at, notes, client_id, collector_id")
      .eq("id", transactionId)
      .single();

    if (error || !tx) {
      return new Response(JSON.stringify({ error: "Transaction introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: client } = await supabase
      .from("clients")
      .select("full_name, phone")
      .eq("id", tx.client_id)
      .single();

    const { data: collector } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", tx.collector_id)
      .single();

    // Build PDF
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([420, 600]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const navy = rgb(0.07, 0.18, 0.36);
    const text = rgb(0.1, 0.1, 0.15);
    const muted = rgb(0.45, 0.5, 0.6);

    // Header
    page.drawRectangle({ x: 0, y: 540, width: 420, height: 60, color: navy });
    page.drawText("GADZOLA", { x: 30, y: 562, size: 22, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Reçu officiel de paiement", {
      x: 30, y: 547, size: 9, font, color: rgb(0.85, 0.9, 1),
    });

    let y = 500;
    const line = (label: string, value: string, opts: { bold?: boolean; size?: number } = {}) => {
      page.drawText(label, { x: 30, y, size: 9, font, color: muted });
      page.drawText(value, {
        x: 30, y: y - 14,
        size: opts.size ?? 12,
        font: opts.bold ? bold : font,
        color: text,
      });
      y -= 38;
    };

    line("Référence", tx.reference, { bold: true, size: 14 });
    line("Date", fmtDate(tx.created_at));
    line("Client", client?.full_name ?? "—", { bold: true });
    line("Téléphone", client?.phone ?? "—");
    line("Méthode", methodLabel(tx.method));
    line("Encaissé par", collector?.full_name ?? "—");

    // Montant box
    page.drawRectangle({
      x: 30, y: y - 20, width: 360, height: 60,
      color: rgb(0.93, 0.97, 1),
      borderColor: navy,
      borderWidth: 1,
    });
    page.drawText("Montant payé", { x: 45, y: y + 18, size: 9, font, color: muted });
    page.drawText(fmtFCFA(Number(tx.amount)), {
      x: 45, y: y - 5, size: 22, font: bold, color: navy,
    });
    y -= 90;

    if (tx.notes) {
      page.drawText("Notes", { x: 30, y, size: 9, font, color: muted });
      page.drawText(tx.notes.slice(0, 80), {
        x: 30, y: y - 14, size: 10, font, color: text,
      });
      y -= 38;
    }

    // Footer
    page.drawLine({
      start: { x: 30, y: 60 }, end: { x: 390, y: 60 },
      thickness: 0.5, color: muted,
    });
    page.drawText("Document généré électroniquement par Gadzola.", {
      x: 30, y: 45, size: 8, font, color: muted,
    });
    page.drawText(`ID transaction : ${tx.id}`, {
      x: 30, y: 32, size: 7, font, color: muted,
    });

    const pdfBytes = await pdf.save();
    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="recu-${tx.reference}.pdf"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
