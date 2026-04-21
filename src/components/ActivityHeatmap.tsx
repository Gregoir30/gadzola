import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { formatFCFA } from "@/lib/format";

interface Tx { created_at: string; amount: number }

export function ActivityHeatmap({ txs }: { txs: Tx[] }) {
  // 53 semaines x 7 jours = 1 an glissant
  const { weeks, total, max, days } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    // Reculer au dimanche pour aligner les colonnes
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 364);
    while (start.getDay() !== 0) start.setDate(start.getDate() - 1);

    const totals = new Map<string, number>();
    let total = 0;
    for (const t of txs) {
      const k = t.created_at.slice(0, 10);
      totals.set(k, (totals.get(k) ?? 0) + Number(t.amount));
      total += Number(t.amount);
    }
    const max = Math.max(...totals.values(), 1);

    const weeks: { date: Date; key: string; value: number }[][] = [];
    let cursor = new Date(start);
    let activeDays = 0;
    while (cursor <= end) {
      const week: typeof weeks[number] = [];
      for (let d = 0; d < 7; d++) {
        const key = cursor.toISOString().slice(0, 10);
        const v = totals.get(key) ?? 0;
        if (v > 0) activeDays++;
        week.push({ date: new Date(cursor), key, value: v });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return { weeks, total, max, days: activeDays };
  }, [txs]);

  const intensity = (v: number) => {
    if (v === 0) return "bg-muted";
    const r = v / max;
    if (r < 0.25) return "bg-success/30";
    if (r < 0.5) return "bg-success/55";
    if (r < 0.75) return "bg-success/75";
    return "bg-success";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-success" />
            Activité des 12 derniers mois
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {days} jours actifs • {formatFCFA(total)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex gap-[3px] min-w-max">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <div
                    key={day.key}
                    title={`${day.date.toLocaleDateString("fr-FR")} — ${formatFCFA(day.value)}`}
                    className={`h-3 w-3 rounded-sm ${intensity(day.value)} transition-transform hover:scale-150 cursor-pointer`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>Moins</span>
          <div className="h-3 w-3 rounded-sm bg-muted" />
          <div className="h-3 w-3 rounded-sm bg-success/30" />
          <div className="h-3 w-3 rounded-sm bg-success/55" />
          <div className="h-3 w-3 rounded-sm bg-success/75" />
          <div className="h-3 w-3 rounded-sm bg-success" />
          <span>Plus</span>
        </div>
      </CardContent>
    </Card>
  );
}
