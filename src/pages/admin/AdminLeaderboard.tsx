import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { formatFCFA } from "@/lib/format";

interface Row {
  collector_id: string;
  name: string;
  total: number;
  count: number;
  monthTotal: number;
}

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

export default function AdminLeaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const monthLabel = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: txs } = await supabase
      .from("transactions")
      .select("amount, collector_id, created_at");
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const map = new Map<string, { total: number; count: number; monthTotal: number }>();
    for (const t of txs ?? []) {
      const e = map.get(t.collector_id) ?? { total: 0, count: 0, monthTotal: 0 };
      e.total += Number(t.amount);
      e.count += 1;
      if (t.created_at >= monthStart) e.monthTotal += Number(t.amount);
      map.set(t.collector_id, e);
    }

    const ids = [...map.keys()];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] };
    const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "—"]));

    const list: Row[] = ids
      .map((id) => ({ collector_id: id, name: names.get(id) ?? "—", ...map.get(id)! }))
      .sort((a, b) => b.monthTotal - a.monthTotal);
    setRows(list);
    setLoading(false);
  };

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const monthMax = useMemo(() => rows[0]?.monthTotal || 1, [rows]);

  const podiumStyle = (rank: number) => {
    if (rank === 0) return { color: "bg-amber-500", h: "h-44", icon: Trophy, badge: "🥇" };
    if (rank === 1) return { color: "bg-slate-300", h: "h-36", icon: Medal, badge: "🥈" };
    return { color: "bg-orange-700", h: "h-28", icon: Award, badge: "🥉" };
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Trophy className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wider">{monthLabel}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Classement collecteurs</h1>
          <p className="text-muted-foreground">Performance du mois en cours, basée sur les montants encaissés.</p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : rows.length === 0 ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground">Aucune donnée pour le moment.</CardContent></Card>
        ) : (
          <>
            {/* Podium */}
            <Card className="overflow-hidden">
              <CardContent className="p-6 md:p-10">
                <div className="flex items-end justify-center gap-3 md:gap-6">
                  {/* Reorder for visual podium: 2, 1, 3 */}
                  {[1, 0, 2].map((idx) => {
                    const r = podium[idx];
                    if (!r) return <div key={idx} className="w-1/4" />;
                    const s = podiumStyle(idx);
                    const Icon = s.icon;
                    return (
                      <motion.div
                        key={r.collector_id}
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.15, type: "spring" }}
                        className="flex flex-col items-center w-1/4 max-w-[180px]"
                      >
                        <div className="text-3xl mb-1">{s.badge}</div>
                        <div className="text-center mb-2 px-1">
                          <div className="font-bold text-sm md:text-base truncate w-full">{r.name}</div>
                          <div className="text-xs text-muted-foreground">{formatFCFA(r.monthTotal)}</div>
                        </div>
                        <div className={`w-full ${s.h} rounded-t-lg ${s.color} shadow-elegant flex items-start justify-center pt-3`}>
                          <Icon className="h-7 w-7 text-white drop-shadow" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Liste complète */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Classement complet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rows.map((r, i) => {
                  const pct = (r.monthTotal / monthMax) * 100;
                  return (
                    <motion.div
                      key={r.collector_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="relative overflow-hidden rounded-lg border bg-card p-3"
                    >
                      <div className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${pct}%` }} />
                      <div className="relative flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-sm">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{r.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.count} transaction{r.count > 1 ? "s" : ""} au total
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold">{formatFCFA(r.monthTotal)}</div>
                          <div className="text-xs text-muted-foreground">ce mois</div>
                        </div>
                        {i < 3 && (
                          <Badge className="ml-2 bg-gold text-gold-foreground">TOP {i + 1}</Badge>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
