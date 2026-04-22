import { useState, useRef, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/hooks/useClients";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, 
  CheckCircle2, 
  Search, 
  QrCode, 
  Flame, 
  ArrowRight, 
  User as UserIcon,
  Wallet,
  Calendar,
  Sparkles,
  RefreshCw,
  TrendingUp
} from "lucide-react";
import { QRScanner } from "@/components/QRScanner";
import { PAYMENT_METHODS, formatFCFA, formatDate } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import { enqueueOfflineTransaction, loadOfflineTransactions, syncOfflineTransactions } from "@/lib/offlineTransactions";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export default function Encaisser() {
  const queryClient = useQueryClient();
  const amountRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("cash");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ ref: string; amount: number } | null>(null);
  const [offlineCount, setOfflineCount] = useState(0);

  const { data: clientsData, isLoading: loadingClients } = useClients({
    search,
    pageSize: 15,
  });

  useEffect(() => {
    setOfflineCount(loadOfflineTransactions().length);

    const sync = async () => {
      const result = await syncOfflineTransactions();
      setOfflineCount(result.remaining);
      if (result.synced > 0) {
        toast({ title: "Synchronisation terminÃ©e", description: `${result.synced} transaction(s) hors-ligne envoyÃ©e(s).` });
      }
    };

    void sync();

    const handleOnline = () => {
      void sync();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // Fetch specific client details + goals + last tx
  const { data: clientDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ["client-enhanced", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // 1. Client Profile
      const { data: profile } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();
      
      // 2. Current Goal
      const { data: goal } = await supabase
        .from("client_goals")
        .select("target_amount")
        .eq("client_id", clientId)
        .eq("year", currentYear)
        .eq("month", currentMonth)
        .maybeSingle();

      // 3. Last Transaction
      const { data: lastTx } = await supabase
        .from("transactions")
        .select("amount, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // 4. Month Total
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
      const { data: monthTxs } = await supabase
        .from("transactions")
        .select("amount")
        .eq("client_id", clientId)
        .gte("created_at", startOfMonth);
      
      const monthTotal = (monthTxs || []).reduce((sum, tx) => sum + Number(tx.amount), 0);

      return {
        profile,
        goal: goal?.target_amount ? Number(goal.target_amount) : null,
        monthTotal,
        lastTx: lastTx ? { amount: Number(lastTx.amount), date: lastTx.created_at } : null,
      };
    },
    enabled: !!clientId,
  });

  const handleScanSuccess = async (text: string) => {
    if (text.startsWith("GZ_CLIENT:")) {
      const id = text.split(":")[1];
      setClientId(id);
      setIsScannerOpen(false);
      setSearch(""); 
      
      // Log audit
      void (supabase.rpc as any)("log_action", {
        _action: "scan_qr",
        _entity_type: "client",
        _entity_id: id,
        _new_data: { context: "direct_scan_in_encaisser" }
      });

      toast({ title: "Client identifiÃ© !", description: "Consultez ses objectifs et entrez le montant." });
      
      // Autofocus amount field after dialog closing animation
      setTimeout(() => {
        amountRef.current?.focus();
      }, 500);
    } else {
      toast({ title: "Code invalide", description: "Ce QR code n'est pas reconnu par Gadzola.", variant: "destructive" });
    }
  };

  const clients = clientsData?.clients ?? [];
  const selected = clientDetails?.profile || clients.find((c) => c.id === clientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast({ title: "Sélectionnez un client", variant: "destructive" });
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      client_id: clientId,
      amount: amt,
      method: method as "cash" | "mobile_money_orange" | "mobile_money_mtn" | "mobile_money_wave" | "mobile_money_moov",
      notes: notes || null,
    };

    const resetForm = () => {
      setClientId("");
      setAmount("");
      setNotes("");
      setMethod("cash");
      setOfflineCount(loadOfflineTransactions().length);
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const queued = enqueueOfflineTransaction(payload);
      setSuccess({ ref: queued.id, amount: amt });
      resetForm();
      setIsSubmitting(false);
      toast({
        title: "Transaction mise en attente",
        description: "Elle sera synchronisée automatiquement dès que la connexion revient.",
      });
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
      return;
    }

    const { data: txId, error } = await supabase.rpc("record_transaction", {
      _client_id: payload.client_id,
      _amount: payload.amount,
      _method: payload.method,
      _notes: payload.notes,
    });

    if (error) {
      const queued = enqueueOfflineTransaction(payload);
      setSuccess({ ref: queued.id, amount: amt });
      resetForm();
      setIsSubmitting(false);
      toast({
        title: "Connexion instable",
        description: "La transaction a été enregistrée localement et sera envoyée plus tard.",
      });
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
      return;
    }

    const { data: tx } = await supabase
      .from("transactions")
      .select("reference")
      .eq("id", txId as string)
      .single();

    setSuccess({ ref: tx?.reference ?? "—", amount: amt });
    resetForm();
    setIsSubmitting(false);

    void queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Encaisser un paiement</h1>
          <p className="text-muted-foreground">Sélectionnez un client et enregistrez la transaction.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
            {typeof navigator !== "undefined" && navigator.onLine ? "En ligne" : "Hors ligne"}
          </span>
          <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
            {offlineCount} transaction{offlineCount > 1 ? "s" : ""} en attente
          </span>
        </div>

        {success && (
          <Card className="border-success bg-success-soft/40">
            <CardContent className="p-5 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">Transaction enregistrÃ©e</div>
                <div className="text-sm text-muted-foreground">
                  {formatFCFA(success.amount)} â€” RÃ©fÃ©rence{" "}
                  <span className="font-mono">{success.ref}</span>. Notification WhatsApp
                  programmÃ©e pour le client.
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSuccess(null)}>
                OK
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Nouvelle transaction</CardTitle>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="border-primary/40 text-primary hover:bg-primary/5 hover:text-primary gap-2 h-9"
              onClick={() => setIsScannerOpen(true)}
            >
              <QrCode className="h-4 w-4" /> Scanner QR
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <AnimatePresence mode="wait">
                  {!selected ? (
                    <motion.div
                      key="search-area"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-2"
                    >
                      <Label>Rechercher un client</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Nom ou tÃ©lÃ©phoneâ€¦"
                          className="pl-9 bg-background/50"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto rounded-md border divide-y bg-card/50 backdrop-blur-sm">
                        {loadingClients ? (
                          <div className="p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-xs">Chargement des clientsâ€¦</span>
                          </div>
                        ) : clients.length === 0 ? (
                          <p className="p-3 text-sm text-muted-foreground text-center">Aucun client trouvÃ©.</p>
                        ) : (
                          clients.map((c) => (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => setClientId(c.id)}
                              className={`flex w-full items-center justify-between gap-2 p-3 text-left text-sm transition-all hover:pl-4 hover:bg-muted/50`}
                            >
                              <div>
                                <div className="font-medium">{c.full_name}</div>
                                <div className="text-xs text-muted-foreground font-mono">{c.phone ?? "â€”"}</div>
                              </div>
                              <span className="text-xs font-semibold px-2 py-1 bg-muted rounded-full">
                                {formatFCFA(c.balance)}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="profile-card"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card className="bg-primary/5 border-primary/20 shadow-glow relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                          <UserIcon className="h-16 w-16" />
                        </div>
                        <CardContent className="p-4 flex items-center justify-between relative">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                              <Sparkles className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="font-display font-bold text-lg">{selected.full_name}</div>
                              <div className="flex items-center gap-3 mt-1">
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {formatFCFA(selected.balance)}
                                </Badge>
                                {clientDetails?.goal && (
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    <span>{Math.round((clientDetails.monthTotal / clientDetails.goal) * 100)}% de l'objectif</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            className="text-muted-foreground h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors z-10"
                            onClick={() => {
                              setClientId("");
                              setSearch("");
                            }}
                          >
                            <ArrowRight className="h-5 w-5" />
                          </Button>
                        </CardContent>
                        
                        {/* Goal Progress Bar & Insights */}
                        <div className="px-4 pb-4 space-y-3 relative z-10">
                          {clientDetails?.goal && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                <span>Progression mensuelle</span>
                                <span>{formatFCFA(clientDetails.monthTotal)} / {formatFCFA(clientDetails.goal)}</span>
                              </div>
                              <Progress 
                                value={Math.min(100, (clientDetails.monthTotal / clientDetails.goal) * 100)} 
                                className="h-1.5 bg-primary/10 shadow-inner"
                              />
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-primary/10">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              {clientDetails?.lastTx ? (
                                <span>Dernier: <span className="font-bold text-foreground">{formatFCFA(clientDetails.lastTx.amount)}</span> le {formatDate(clientDetails.lastTx.date)}</span>
                              ) : (
                                <span>Aucune transaction rÃ©cente</span>
                              )}
                            </div>
                            
                            {clientDetails?.lastTx && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-7 text-[10px] font-bold gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 px-2"
                                onClick={() => {
                                  setAmount(String(clientDetails.lastTx?.amount));
                                  amountRef.current?.focus();
                                }}
                              >
                                <RefreshCw className="h-3 w-3" />
                                REPRENDRE
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Montant (FCFA)</Label>
                  <Input
                    ref={amountRef}
                    type="number"
                    inputMode="decimal"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="ex. 25000"
                    className="text-lg font-bold"
                  />
                  
                  <AnimatePresence>
                    {selected && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-wrap gap-1.5 mt-2"
                      >
                        {QUICK_AMOUNTS.map((amt) => (
                          <Button
                            key={amt}
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2 text-[10px] font-bold bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => setAmount(String(amt))}
                          >
                            +{amt}
                          </Button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="space-y-2">
                  <Label>MÃ©thode</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (facultatif)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !clientId}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer la transaction
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <QRScanner 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScanSuccess={handleScanSuccess} 
      />
    </AppShell>
  );
}





