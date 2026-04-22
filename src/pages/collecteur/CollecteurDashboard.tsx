import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, History, ArrowRight, MapPin, Satellite, Clock3 } from "lucide-react";
import { formatDate, formatFCFA, methodLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useCollectorTrail } from "@/hooks/useCollectorTrail";

export default function CollecteurDashboard() {
  const { user } = useAuth();
  const { currentPoint, trail, supported, error } = useCollectorTrail(user?.id ?? null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [count, setCount] = useState(0);
  const [recent, setRecent] = useState<{ id: string; amount: number; reference: string; method: string; created_at: string; client_name: string }[]>([]);
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
    setCount(list.length);
    setTotalAll(list.reduce((s, t) => s + Number(t.amount), 0));

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    setTodayTotal(
      list
        .filter((t) => new Date(t.created_at) >= startOfDay)
        .reduce((s, t) => s + Number(t.amount), 0),
    );

    const recentSlice = list.slice(0, 8);
    const clientIds = [...new Set(recentSlice.map((t) => t.client_id))];
    const { data: clients } = clientIds.length
      ? await supabase.from("clients").select("id, full_name").in("id", clientIds)
      : { data: [] as { id: string; full_name: string }[] };
    const clientMap = new Map((clients ?? []).map((c) => [c.id, c.full_name]));

    setRecent(
      recentSlice.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        reference: t.reference,
        method: t.method,
        created_at: t.created_at,
        client_name: clientMap.get(t.client_id) ?? "—",
      })),
    );
    setLoading(false);
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Bonjour 👋</h1>
            <p className="text-muted-foreground">Votre activité de collecte aujourd'hui.</p>
          </div>
          <Button asChild>
            <Link to="/collecteur/encaisser">
              Encaisser un paiement <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Encaissé aujourd'hui" value={formatFCFA(todayTotal)} icon={Wallet} tone="primary" />
          <StatCard label="Total cumulé" value={formatFCFA(totalAll)} icon={Wallet} tone="success" />
          <StatCard label="Transactions" value={count} icon={History} tone="gold" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="glass border-border/40 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" />
                Itinéraire GPS en direct
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!supported ? (
                <p className="text-sm text-muted-foreground">{error ?? "La géolocalisation n'est pas disponible."}</p>
              ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : currentPoint ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background/60 p-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Satellite className="h-3.5 w-3.5" /> Latitude
                      </div>
                      <div className="font-mono text-sm font-semibold">{currentPoint.latitude.toFixed(6)}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-background/60 p-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Satellite className="h-3.5 w-3.5" /> Longitude
                      </div>
                      <div className="font-mono text-sm font-semibold">{currentPoint.longitude.toFixed(6)}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-background/60 p-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" /> Précision
                      </div>
                      <div className="font-mono text-sm font-semibold">{currentPoint.accuracy ? `${Math.round(currentPoint.accuracy)} m` : "—"}</div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-border">
                    <iframe
                      title="Carte GPS du collecteur"
                      width="100%"
                      height="280"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${currentPoint.longitude - 0.01}%2C${currentPoint.latitude - 0.01}%2C${currentPoint.longitude + 0.01}%2C${currentPoint.latitude + 0.01}&layer=mapnik&marker=${currentPoint.latitude}%2C${currentPoint.longitude}`}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  En attente du premier point GPS. L’itinéraire sera enregistré dès qu’une position sera disponible.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                  <MapPin className="h-3.5 w-3.5" /> {trail.length} point{trail.length > 1 ? "s" : ""} mémorisé{trail.length > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                  {navigator.onLine ? "Synchronisation active" : "Hors ligne"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Statut du terrain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <div className="text-xs text-muted-foreground">Dernier passage</div>
                <div className="font-semibold">{currentPoint ? formatDate(currentPoint.recorded_at) : "Aucun point GPS"}</div>
              </div>
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <div className="text-xs text-muted-foreground">Capteur</div>
                <div className="font-semibold">{supported ? "Géolocalisation navigateur" : "Indisponible"}</div>
              </div>
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <div className="text-xs text-muted-foreground">Mode collecte</div>
                <div className="font-semibold">Collecte prête à synchroniser hors-ligne</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vos dernières transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune transaction encore. Cliquez sur « Encaisser » pour démarrer.
              </p>
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
                    {recent.map((t) => (
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
