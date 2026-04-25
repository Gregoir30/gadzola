import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { transactionId, clientId, method, amount } = await req.json();

    if (!transactionId || !clientId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fedapaySecret = Deno.env.get("FEDAPAY_SECRET_KEY");
    if (!fedapaySecret) {
      console.error("FEDAPAY_SECRET_KEY is not configured.");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify transaction with FedaPay API
    const fedapayRes = await fetch(`https://sandbox-api.fedapay.com/v1/transactions/${transactionId}`, {
      headers: {
        "Authorization": `Bearer ${fedapaySecret}`,
        "Content-Type": "application/json"
      }
    });

    if (!fedapayRes.ok) {
      const err = await fedapayRes.text();
      console.error("FedaPay verification failed:", err);
      return new Response(JSON.stringify({ error: "Failed to verify transaction with FedaPay" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fedapayData = await fedapayRes.json();
    const tx = fedapayData.v1?.transaction || fedapayData.transaction;

    if (!tx || tx.status !== "approved") {
      return new Response(JSON.stringify({ error: "Transaction not approved by FedaPay", status: tx?.status }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Amount verification (optional but recommended)
    const txAmount = tx.amount;
    if (txAmount < amount) {
       console.warn(`Amount mismatch: expected ${amount}, got ${txAmount}`);
       // Depending on business logic, we could reject or just use txAmount. We'll use txAmount.
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Insert into transactions
    // Assuming transactions table has client_id, amount, method, reference, notes
    const { data: insertedTx, error } = await supabase
      .from("transactions")
      .insert({
        client_id: clientId,
        amount: txAmount,
        method: method || "mobile_money",
        reference: `FEDA-${transactionId}`,
        notes: `Paiement en ligne via FedaPay (${tx.custom_metadata?.network || method})`
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to insert transaction into database:", error);
      return new Response(JSON.stringify({ error: "Failed to save transaction to database" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, transaction: insertedTx }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Function error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
