import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "gold" | "primary";
}

export function StatCard({ label, value, hint, icon: Icon, tone = "default" }: StatCardProps) {
  const toneClasses = {
    default: "bg-gradient-to-br from-cyan-500 to-blue-500 text-white",
    success: "gradient-success text-white",
    gold: "gradient-gold text-foreground",
    primary: "gradient-primary text-white",
  }[tone];

  return (
    <Card className="glass border-border/40 hover:border-primary/40 hover:shadow-glow transition-all">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl shadow-lg shrink-0", toneClasses)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="font-display text-2xl font-bold truncate">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
