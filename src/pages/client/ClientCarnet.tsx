import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatFCFA, methodLabel } from "@/lib/format";
import {
  BookOpen, Target, Flame, Sparkles, Download, FileDown,
  ChevronLeft, ChevronRight, Loader2, Pencil, Check, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { BadgesGrid } from "@/components/BadgesGrid";
import { computeBadges } from "@/lib/badges";

interface Tx {
  id: string;
  amount: number;
  reference: string;
  method: string;
  created_at: string;
}

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

export default function ClientCarnet() {
  const { user, session } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");
  const [allTxs, setAllTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [goalAmount, setGoalAmount] = useState<number | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const [insight, setInsight] = useState<string>("");
  const [insightLoading, setInsightLoading] = useState(false);

  const [pdfLoading, setPdfLoading] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) void loadAll(user.id);
  }, [user]);

  useEffect(() => {
    if (clientId) void loadGoal(clientId, year, month);
  }, [clientId, year, month]);

  const loadAll = async (uid: string) => {
    setLoading(true);
    const { data: client } = await supabase
      .from("clients").select("id, full_name").eq("profile_id", uid).single();
    if (!client) { setLoading(false); return; }
    setClientId(client.id);
    setClientName(client.full_name);
    const { data } = await supabase
      .from("transactions")
      .select("id, amount, reference, method, created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });
    setAllTxs((data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })));
    setLoading(false);
  };

  const loadGoal = async (cid: string, y: number, m: number) => {
    const { data } = await supabase
      .from("client_goals")
      .select("target_amount")
      .eq("client_id", cid).eq("year", y).eq("month", m).maybeSingle();
    setGoalAmount(data ? Number(data.target_amount) : null);
    setGoalInput(data ? String(data.target_amount) : "");
  };

  const monthTxs = useMemo(
    () => allTxs.filter((t) => {
      const d = new Date(t.created_at);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    }),
    [allTxs, year, month],
  );

  const monthTotal = monthTxs.reduce((s, t) => s + t.amount, 0);

  // Streak : nb mois consécutifs jusqu'à maintenant où objectif atteint OU au moins 1 paiement
  const streak = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of allTxs) {
      const d = new Date(t.created_at);
      const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
      totals.set(k, (totals.get(k) ?? 0) + t.amount);
    }
    let s = 0;
    const cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    for (let i = 0; i < 24; i++) {
      const k = `${cursor.getFullYear()}-${cursor.getMonth() + 1}`;
      if ((totals.get(k) ?? 0) > 0) {
        s++;
        cursor.setMonth(cursor.getMonth() - 1);
      } else break;
    }
    return s;
  }, [allTxs]);

  // Calcul des badges
  const badges = useMemo(() => {
    // Calcul mois avec objectif atteint
    // Pour simplifier ici, on regarde les mois dans allTxs
    const monthsWithGoal = 0; // Serait mieux avec une query sur client_goals, mais on peut l'estimer ou le fetcher
    
    return computeBadges({
      totalAmount: allTxs.reduce((s, t) => s + t.amount, 0),
      txCount: allTxs.length,
      monthsActive: streak,
      monthsWithGoalReached: streak, // Estimation par défaut pour le moment
    });
  }, [allTxs, streak]);

  const goalPct = goalAmount && goalAmount > 0 ? Math.min(100, (monthTotal / goalAmount) * 100) : 0;

  const saveGoal = async () => {
    if (!clientId) return;
    const amt = parseFloat(goalInput);
    if (!amt || amt <= 0) { toast.error("Montant invalide"); return; }
    const { error } = await supabase
      .from("client_goals")
      .upsert({ client_id: clientId, year, month, target_amount: amt }, { onConflict: "client_id,year,month" });
    if (error) { toast.error(error.message); return; }
    setGoalAmount(amt);
    setEditingGoal(false);
    toast.success("Objectif enregistré");
    if (monthTotal >= amt) fireConfetti();
  };

  const fireConfetti = () => {
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.4 }, colors: ["#1e40af","#10b981","#f59e0b"] });
  };

  // Confetti automatique quand l'objectif est atteint
  useEffect(() => {
    if (goalAmount && monthTotal >= goalAmount && monthTotal > 0) {
      const key = `gadzola-confetti-${year}-${month}-${goalAmount}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        setTimeout(fireConfetti, 400);
      }
    }
  }, [goalAmount, monthTotal, year, month]);

  const generateInsight = async () => {
    setInsightLoading(true);
    setInsight("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-insights");
      if (error) throw error;
      setInsight(data.insight ?? "");
    } catch (e: any) {
      toast.error("Impossible de générer l'analyse", { description: e.message });
    } finally {
      setInsightLoading(false);
    }
  };

  const downloadCarnetPdf = async () => {
    if (!session) return;
    setPdfLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-monthly-carnet?year=${year}&month=${month}`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!resp.ok) throw new Error("Erreur PDF");
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `carnet-${year}-${String(month).padStart(2,"0")}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Carnet téléchargé");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const downloadReceipt = async (txId: string, ref: string) => {
    if (!session) return;
    setReceiptLoading(txId);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-receipt`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactionId: txId }),
      });
      if (!resp.ok) throw new Error("Erreur PDF");
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `recu-${ref}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setReceiptLoading(null);
    }
  };

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1);
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl">
        {/* Header carnet */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <BookOpen className="h-5 w-5" />
              <span className="text-sm font-medium uppercase tracking-wider">Mon carnet d'épargne</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">{clientName}</h1>
          </div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-white shadow-lg"
          >
            <Flame className="h-5 w-5" />
            <span className="font-bold">{streak}</span>
            <span className="text-sm">{streak > 1 ? "mois de suite" : "mois"}</span>
          </motion.div>
        </div>

        {/* Gamification Area */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActivityHeatmap txs={allTxs} />
          </div>
          <div>
            <BadgesGrid badges={badges} />
          </div>
        </div>

        {/* Navigation mois + Objectif */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="overflow-hidden border-2 border-primary/10">
            <div className="bg-primary p-1">
              <div className="bg-card rounded-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={prevMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground uppercase">Mois</div>
                      <div className="text-xl font-bold">{MONTHS[month - 1]} {year}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={nextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="text-center pb-6">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Total du mois</div>
                  <motion.div
                    key={monthTotal}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-bold text-primary"
                  >
                    {formatFCFA(monthTotal)}
                  </motion.div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {monthTxs.length} paiement{monthTxs.length > 1 ? "s" : ""}
                  </div>
                </CardContent>
              </div>
            </div>
          </Card>

          <Card className="border-2 border-success/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-success" />
                Objectif du mois
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {editingGoal ? (
                <div className="flex gap-2">
                  <Input
                    type="number" autoFocus
                    placeholder="ex. 50000"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                  />
                  <Button onClick={saveGoal} size="icon"><Check className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {goalAmount ? formatFCFA(goalAmount) : "Aucun objectif"}
                    </div>
                    {goalAmount && (
                      <div className="text-xs text-muted-foreground">
                        Reste {formatFCFA(Math.max(0, goalAmount - monthTotal))}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditingGoal(true)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {goalAmount && (
                <div className="space-y-1">
                  <Progress value={goalPct} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{goalPct.toFixed(0)}%</span>
                    {goalPct >= 100 && (
                      <Badge className="bg-success text-success-foreground">🎉 Objectif atteint</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={generateInsight} disabled={insightLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {insightLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Coach IA
          </Button>
          <Button onClick={downloadCarnetPdf} disabled={pdfLoading} variant="outline">
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Télécharger le carnet PDF
          </Button>
        </div>

        {/* Insight IA */}
        <AnimatePresence>
          {insight && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-primary/30 bg-accent">
                <CardContent className="p-5 flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
                      Coach Gadzola
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{insight}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline mois */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Pages du mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : monthTxs.length === 0 ? (
              <div className="py-12 text-center">
                <Wallet className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">Aucun paiement ce mois-ci.</p>
                <p className="text-xs text-muted-foreground mt-1">Les nouvelles entrées apparaîtront ici.</p>
              </div>
            ) : (
              <div className="relative pl-6 md:pl-8">
                <div className="absolute left-2 md:left-3 top-2 bottom-2 w-0.5 bg-primary/40" />
                {monthTxs.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative pb-5"
                  >
                    <motion.div
                      whileHover={{ scale: 1.2 }}
                      className="absolute -left-[1.35rem] md:-left-[1.6rem] top-3 h-4 w-4 rounded-full bg-success ring-4 ring-success-soft"
                    />
                    <div className="rounded-lg border bg-card p-4 hover:shadow-elegant transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-2xl font-bold text-primary">{formatFCFA(t.amount)}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(t.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <Badge variant="outline" className="mt-2 text-xs">{methodLabel(t.method)}</Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-xs text-muted-foreground mb-2">{t.reference}</div>
                          <Button
                            variant="ghost" size="sm"
                            disabled={receiptLoading === t.id}
                            onClick={() => downloadReceipt(t.id, t.reference)}
                          >
                            {receiptLoading === t.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Download className="h-3.5 w-3.5" />}
                            Reçu
                          </Button>
                        </div>
                      </div>
                    </div>
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
