import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";
import type { Badge } from "@/lib/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export function BadgesGrid({ badges }: { badges: Badge[] }) {
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <Card className="glass border-border/40 overflow-hidden">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5 text-gold" />
          Mes badges
        </CardTitle>
        <span className="text-sm text-muted-foreground">
          <span className="font-bold text-gradient">{unlockedCount}</span> / {badges.length} débloqués
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AnimatePresence>
            {badges.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -4 }}
                className={`relative rounded-xl p-3 text-center transition-all ${
                  b.unlocked
                    ? "glass border border-primary/30 shadow-glow"
                    : "bg-muted/30 border border-border/40 opacity-60"
                }`}
              >
                <div
                  className={`relative mx-auto h-14 w-14 rounded-2xl flex items-center justify-center ${
                    b.unlocked
                      ? `bg-gradient-to-br ${b.gradient} shadow-lg`
                      : "bg-muted"
                  }`}
                >
                  {b.unlocked ? (
                    <b.icon className="h-7 w-7 text-white" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                  {b.unlocked && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${b.gradient} blur-xl -z-10`}
                    />
                  )}
                </div>
                <div className="mt-2 font-semibold text-xs leading-tight">{b.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{b.description}</div>
                {!b.unlocked && b.progress !== undefined && b.progress > 0 && (
                  <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${b.gradient}`}
                      style={{ width: `${b.progress}%` }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
