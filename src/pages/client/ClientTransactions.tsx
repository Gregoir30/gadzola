import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatFCFA, methodLabel } from "@/lib/format";

interface Tx {
  id: string;
  amount: number;
  reference: string;
  method: string;
  created_at: string;
}

export default function ClientTransactions() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) void load(user.id);
  }, [user]);

  const load = async (uid: string) => {
    setLoading(true);
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("profile_id", uid)
      .single();
    if (client) {
      const { data } = await supabase
        .from("transactions")
        .select("id, amount, reference, method, created_at")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });
      setTxs((data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })));
    }
    setLoading(false);
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Mes paiements</h1>
          <p className="text-muted-foreground">Historique complet de vos transactions Gadzola.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{txs.length} paiement(s)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : txs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun paiement.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                      <th className="py-2 pr-3">Référence</th>
                      <th className="py-2 pr-3">Méthode</th>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((t) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="py-3 pr-3 font-mono text-xs">{t.reference}</td>
                        <td className="py-3 pr-3 text-muted-foreground">{methodLabel(t.method)}</td>
                        <td className="py-3 pr-3 text-muted-foreground">{formatDate(t.created_at)}</td>
                        <td className="py-3 text-right font-semibold">{formatFCFA(t.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
