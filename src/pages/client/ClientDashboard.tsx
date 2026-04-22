import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, History, ArrowRight, TrendingUp, Sparkles, BookOpen, Flame } from "lucide-react";
import { formatDate, formatFCFA, methodLabel } from "@/lib/format";
import { Link } from "react-router-dom";
import { useRealtimePayments } from "@/hooks/useRealtimePayments";
import { BadgesGrid } from "@/components/BadgesGrid";
import { computeBadges } from "@/lib/badges";

interface ClientInfo { id: string; full_name: string; balance: number }
interface Tx { id: string; amount: number; reference: string; method: string; created_at: string }

export default function ClientDashboard() {
  const { user } = useAuth();
  const [info, setInfo] = useState<ClientInfo | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    const { data: client } = await supabase
      .from("clients").select("id, full_name, balance").eq("profile_id", uid).single();

    if (client) {
      setInfo({ id: client.id, full_name: client.full_name, balance: Number(client.balance) });
      const { data } = await supabase
        .from("transactions")
        .select("id, amount, reference, method, created_at")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });
      setTxs((data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void load(user.id);
  }, [user, load]);

  // Realtime: si un nouveau paiement arrive, recharge
  useRealtimePayments(info?.id ?? null, () => user && load(user.id));

  // Streak (mois consécutifs avec paiement)
  const streak = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of txs) {
      const d = new Date(t.created_at);
      totals.set(`${d.getFullYear()}-${d.getMonth() + 1}`, 1);
    }
    const today = new Date();
    let s = 0;
    const cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    for (let i = 0; i < 24; i++) {
      const k = `${cursor.getFullYear()}-${cursor.getMonth() + 1}`;
      if (totals.has(k)) { s++; cursor.setMonth(cursor.getMonth() - 1); } else break;
    }
    return s;
  }, [txs]);

  const monthsActive = streak;
  const monthsWithGoalReached = 0; // simplifié; calculable via client_goals
  const badges = useMemo(
    () => computeBadges({
      totalAmount: info?.balance ?? 0,
      txCount: txs.length,
      monthsActive,
      monthsWithGoalReached,
    }),
    [info, txs, monthsActive],
  );

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl">
        {/* Hero greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-primary text-primary-foreground shadow-elegant"
        >
          <div className="absolute inset-0 grid-pattern opacity-20" />
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
          <div className="relative">
            <div className="text-white/80 text-sm">Bonjour 👋</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">{info?.full_name ?? "Client"}</h1>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-white/70 text-xs uppercase tracking-wider">Solde total cumulé</span>
            </div>
            <div className="font-display text-4xl md:text-5xl font-bold mt-1">
              {loading ? "…" : formatFCFA(info?.balance ?? 0)}
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile icon={History} label="Transactions" value={txs.length} hint="Total enregistré" tone="sky" />
          <StatTile icon={Flame} label="Streak" value={`${streak} mois`} hint="Mois consécutifs" tone="orange" />
          <StatTile icon={TrendingUp} label="Dernier paiement" value={txs[0] ? formatFCFA(txs[0].amount) : "—"} hint={txs[0] ? formatDate(txs[0].created_at) : "Aucun"} tone="emerald" />
        </div>

        {/* CTA carnet */}
        <Card className="glass border-primary/30 overflow-hidden">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-glow shrink-0">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-display font-bold">Découvre ton carnet animé</div>
                <div className="text-sm text-muted-foreground">Objectifs, timeline, coach IA, reçu PDF</div>
              </div>
            </div>
            <Button asChild className="bg-primary border-0 shadow-glow text-primary-foreground hover:bg-primary/90">
              <Link to="/client/carnet">Ouvrir <Sparkles className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* Badges */}
        <BadgesGrid badges={badges} />

        {/* Derniers paiements */}
        <Card className="glass border-border/40">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Derniers paiements</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/client/transactions">Voir tout <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : txs.length === 0 ? (
              <div className="py-8 text-center">
                <Wallet className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucun paiement pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {txs.slice(0, 5).map((t) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between gap-3 rounded-xl glass p-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-success flex items-center justify-center shrink-0">
                        <Wallet className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold">{formatFCFA(t.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {methodLabel(t.method)} • {formatDate(t.created_at)}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">{t.reference}</Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function StatTile({
  icon: Icon, label, value, hint, tone,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; hint: string; tone: "sky" | "orange" | "emerald" }) {
  const toneClasses = {
    sky: "bg-sky-500 text-white",
    orange: "bg-orange-500 text-white",
    emerald: "bg-emerald-500 text-white",
  }[tone];

  return (
    <motion.div whileHover={{ y: -3 }}>
      <Card className="glass border-border/40 overflow-hidden">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${toneClasses} shadow-lg shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="font-display text-xl font-bold truncate">{value}</div>
            <div className="text-[10px] text-muted-foreground truncate">{hint}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
