import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Users, UserCheck, Bell, Loader2, Shield, TrendingUp, Clock3, MapPin } from "lucide-react";
import { formatFCFA, formatDate, methodLabel } from "@/lib/format";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface Stats {
  totalAmount: number;
  txCount: number;
  collectorCount: number;
  clientCount: number;
}

interface RecentTx {
  id: string;
  amount: number;
  method: string;
  reference: string;
  created_at: string;
  client_name: string;
  collector_name: string;
}

interface RawTx {
  id: string;
  amount: number;
  method: string;
  reference: string;
  created_at: string;
  collector_id: string;
  client_id: string;
}

interface CollectorLocation {
  id: string;
  collector_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--gold))",
  "hsl(var(--accent-foreground))",
  "hsl(var(--muted-foreground))",
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalAmount: 0, txCount: 0, collectorCount: 0, clientCount: 0 });
  const [recent, setRecent] = useState<RecentTx[]>([]);
  const [allTxs, setAllTxs] = useState<RawTx[]>([]);
  const [collectorNames, setCollectorNames] = useState<Map<string, string>>(new Map());
  const [locations, setLocations] = useState<CollectorLocation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);

    const [{ data: txs }, { data: collectors }, { data: clients }, { data: rawAudit }] = await Promise.all([
      supabase.from("transactions").select("id, amount, method, reference, created_at, collector_id, client_id"),
      supabase.from("user_roles").select("user_id").eq("role", "collecteur"),
      supabase.from("clients").select("id"),
      supabase.from("audit_logs").select("id, action, entity_type, created_at, user_id").order("created_at", { ascending: false }).limit(6),
    ]);

    const { data: rawLocations } = await supabase
      .from("collector_locations")
      .select("id, collector_id, latitude, longitude, accuracy, recorded_at")
      .order("recorded_at", { ascending: false })
      .limit(20);

    const txList: RawTx[] = (txs ?? []).map((t) => ({ ...t, amount: Number(t.amount) }));
    const totalAmount = txList.reduce((sum, t) => sum + t.amount, 0);

    setAllTxs(txList);
    setLocations((rawLocations ?? []).map((loc) => ({
      id: loc.id,
      collector_id: loc.collector_id,
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      accuracy: loc.accuracy != null ? Number(loc.accuracy) : null,
      recorded_at: loc.recorded_at,
    })));
    setStats({
      totalAmount,
      txCount: txList.length,
      collectorCount: collectors?.length ?? 0,
      clientCount: clients?.length ?? 0,
    });

    const sortedRecent = [...txList].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10);

    const collectorIds = [...new Set(txList.map((t) => t.collector_id))];
    const clientIds = [...new Set(sortedRecent.map((t) => t.client_id))];
    const auditUserIds = [...new Set((rawAudit ?? []).map((a) => a.user_id).filter(Boolean))];

    const [{ data: profiles }, { data: clientRecs }, { data: auditProfiles }] = await Promise.all([
      collectorIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", collectorIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      clientIds.length
        ? supabase.from("clients").select("id, full_name").in("id", clientIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
      auditUserIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", auditUserIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "—"]));
    const clientMap = new Map((clientRecs ?? []).map((c) => [c.id, c.full_name]));
    const auditProfileMap = new Map((auditProfiles ?? []).map((p) => [p.id, p.full_name ?? "Utilisateur"]));
    setCollectorNames(profileMap);

    setRecent(
      sortedRecent.map((t) => ({
        id: t.id,
        amount: t.amount,
        method: t.method,
        reference: t.reference,
        created_at: t.created_at,
        client_name: clientMap.get(t.client_id) ?? "—",
        collector_name: profileMap.get(t.collector_id) ?? "—",
      })),
    );

    setAuditLogs(
      (rawAudit ?? []).map((a) => ({
        id: a.id,
        action: a.action,
        entity_type: a.entity_type,
        created_at: a.created_at,
        user_name: auditProfileMap.get(a.user_id!) ?? "Admin",
      }))
    );

    setLoading(false);
  };

  // Évolution sur 14 jours
  const dailyData = useMemo(() => {
    const days: { key: string; label: string; total: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        key,
        label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        total: 0,
      });
    }
    const map = new Map(days.map((d) => [d.key, d]));
    for (const t of allTxs) {
      const k = t.created_at.slice(0, 10);
      const entry = map.get(k);
      if (entry) entry.total += t.amount;
    }
    return days;
  }, [allTxs]);

  // Top 5 collecteurs
  const topCollectors = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of allTxs) {
      totals.set(t.collector_id, (totals.get(t.collector_id) ?? 0) + t.amount);
    }
    return [...totals.entries()]
      .map(([id, total]) => ({
        name: collectorNames.get(id) ?? "—",
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [allTxs, collectorNames]);

  // Répartition par méthode
  const methodData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of allTxs) {
      totals.set(t.method, (totals.get(t.method) ?? 0) + t.amount);
    }
    return [...totals.entries()].map(([method, value]) => ({
      name: methodLabel(method),
      value,
    }));
  }, [allTxs]);

  const reportSummary = useMemo(() => {
    const averageTicket = stats.txCount > 0 ? stats.totalAmount / stats.txCount : 0;
    const dominantMethod = [...methodData].sort((a, b) => b.value - a.value)[0] ?? null;
    const latestLocation = locations[0] ?? null;
    const latestCollectorName = latestLocation ? collectorNames.get(latestLocation.collector_id) ?? "—" : "—";

    return { averageTicket, dominantMethod, latestLocation, latestCollectorName };
  }, [collectorNames, locations, methodData, stats.totalAmount, stats.txCount]);

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">Supervision des collectes Gadzola en temps réel.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total collecté" value={formatFCFA(stats.totalAmount)} icon={Wallet} tone="primary" />
          <StatCard label="Transactions" value={stats.txCount} icon={Bell} tone="success" />
          <StatCard label="Collecteurs actifs" value={stats.collectorCount} icon={UserCheck} tone="gold" />
          <StatCard label="Clients" value={stats.clientCount} icon={Users} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Ticket moyen
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{formatFCFA(reportSummary.averageTicket)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4 text-success" /> Méthode dominante
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-bold">{reportSummary.dominantMethod?.name ?? "—"}</div>
              <div className="text-xs text-muted-foreground">
                {reportSummary.dominantMethod ? formatFCFA(reportSummary.dominantMethod.value) : "Aucune donnée"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-gold" /> Dernier point GPS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-sm font-semibold">{reportSummary.latestCollectorName}</div>
              <div className="text-xs text-muted-foreground">
                {reportSummary.latestLocation ? formatDate(reportSummary.latestLocation.recorded_at) : "Aucun point"}
              </div>
            </CardContent>
          </Card>
        </div>

        <ActivityHeatmap txs={allTxs.map((t) => ({ created_at: t.created_at, amount: t.amount }))} />

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Évolution des collectes (14 derniers jours)</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [formatFCFA(value), "Total"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorTotal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 5 collecteurs</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {topCollectors.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune donnée.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCollectors} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [formatFCFA(value), "Total"]}
                    />
                    <Bar dataKey="total" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Répartition par méthode</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {methodData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune donnée.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methodData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={2}
                    >
                      {methodData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number) => formatFCFA(value)}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-none shadow-premium overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Wallet className="h-4 w-4 text-primary" /> Dernières transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary/50" /></div>
              ) : recent.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Aucune transaction.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/10 border-b">
                        <th className="px-4 py-3 font-bold">Référence</th>
                        <th className="px-4 py-3 font-bold">Client</th>
                        <th className="px-4 py-3 font-bold">Méthode</th>
                        <th className="px-4 py-3 text-right font-bold">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {recent.map((t) => (
                        <tr key={t.id} className="hover:bg-muted/5 transition-colors">
                          <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">{t.reference}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{t.client_name}</div>
                            <div className="text-[10px] text-muted-foreground">{formatDate(t.created_at)}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{methodLabel(t.method)}</td>
                          <td className="px-4 py-3 text-right font-bold text-primary">{formatFCFA(t.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-premium overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Shield className="h-4 w-4 text-primary" /> Activité Audit
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary/50" /></div>
              ) : auditLogs.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Aucun log trouvé.</p>
              ) : (
                <div className="divide-y">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="px-4 py-3 hover:bg-muted/5 transition-colors group">
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-xs font-bold text-foreground capitalize">{log.action.replace(/_/g, " ")}</div>
                        <div className="text-[10px] text-muted-foreground">{formatDate(log.created_at)}</div>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                        <span>Par {log.user_name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-muted font-medium uppercase">{log.entity_type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-premium overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <MapPin className="h-4 w-4 text-primary" /> Validation GPS des collectes
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] p-6">
            <div className="overflow-hidden rounded-2xl border border-border">
              {reportSummary.latestLocation ? (
                <iframe
                  title="Carte GPS administrateur"
                  width="100%"
                  height="320"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${reportSummary.latestLocation.longitude - 0.01}%2C${reportSummary.latestLocation.latitude - 0.01}%2C${reportSummary.latestLocation.longitude + 0.01}%2C${reportSummary.latestLocation.latitude + 0.01}&layer=mapnik&marker=${reportSummary.latestLocation.latitude}%2C${reportSummary.latestLocation.longitude}`}
                />
              ) : (
                <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                  Aucun point GPS disponible pour le moment.
                </div>
              )}
            </div>
            <div className="space-y-3">
              {locations.slice(0, 5).map((location) => (
                <div key={location.id} className="rounded-xl border border-border bg-background/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{collectorNames.get(location.collector_id) ?? "Collecteur"}</div>
                    <div className="text-[10px] text-muted-foreground">{formatDate(location.recorded_at)}</div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground font-mono">
                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Précision: {location.accuracy ? `${Math.round(location.accuracy)} m` : "—"}
                  </div>
                </div>
              ))}
              {locations.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun trajet n’a encore été synchronisé.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
