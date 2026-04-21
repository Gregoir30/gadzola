import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { formatDate } from "@/lib/format";

interface Notif {
  id: string;
  message: string;
  recipient_phone: string | null;
  channel: string;
  status: string;
  created_at: string;
}

export default function AdminNotifications() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, message, recipient_phone, channel, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setItems(data ?? []);
    setLoading(false);
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Journal des notifications WhatsApp envoyées (mode simulé — branchement WhatsApp réel à venir).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dernières notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune notification pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {items.map((n) => (
                  <div key={n.id} className="flex gap-3 rounded-lg border bg-card p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-medium uppercase text-muted-foreground">
                          {n.channel} • {n.recipient_phone ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(n.created_at)}</span>
                      </div>
                      <p className="text-sm">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
