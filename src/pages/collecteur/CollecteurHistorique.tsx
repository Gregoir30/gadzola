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
  client_name: string;
}

export default function CollecteurHistorique() {
  const { user } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) void load(user.id);
  }, [user]);

  const load = async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("id, amount, reference, method, created_at, client_id")
      .eq("collector_id", uid)
      .order("created_at", { ascending: false });

    const list = data ?? [];
    const clientIds = [...new Set(list.map((t) => t.client_id))];
    const { data: clients } = clientIds.length
      ? await supabase.from("clients").select("id, full_name").in("id", clientIds)
      : { data: [] as { id: string; full_name: string }[] };
    const map = new Map((clients ?? []).map((c) => [c.id, c.full_name]));

    setTxs(
      list.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        reference: t.reference,
        method: t.method,
        created_at: t.created_at,
        client_name: map.get(t.client_id) ?? "—",
      })),
    );
    setLoading(false);
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Historique</h1>
          <p className="text-muted-foreground">Toutes vos transactions encaissées.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{txs.length} transaction(s)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : txs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune transaction encore.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                      <th className="py-2 pr-3">Référence</th>
                      <th className="py-2 pr-3">Client</th>
                      <th className="py-2 pr-3">Méthode</th>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((t) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="py-3 pr-3 font-mono text-xs">{t.reference}</td>
                        <td className="py-3 pr-3">{t.client_name}</td>
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
