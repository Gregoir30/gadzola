import { Trophy, Award, Flame, Coins, Star, Calendar, Crown } from "lucide-react";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  unlocked: boolean;
  progress?: number; // 0-100
}

export interface BadgeContext {
  totalAmount: number;
  txCount: number;
  monthsActive: number; // mois consécutifs avec au moins 1 paiement
  monthsWithGoalReached: number;
}

export function computeBadges(ctx: BadgeContext): Badge[] {
  const defs = [
    {
      id: "first-payment",
      name: "Premier pas",
      description: "Votre tout premier paiement enregistré",
      icon: Star,
      gradient: "from-blue-500 to-cyan-500",
      target: 1,
      current: ctx.txCount,
    },
    {
      id: "five-payments",
      name: "Régulier",
      description: "5 paiements enregistrés",
      icon: Calendar,
      gradient: "from-green-500 to-emerald-500",
      target: 5,
      current: ctx.txCount,
    },
    {
      id: "100k",
      name: "100K Club",
      description: "100 000 FCFA cumulés",
      icon: Coins,
      gradient: "from-amber-500 to-orange-500",
      target: 100000,
      current: ctx.totalAmount,
    },
    {
      id: "500k",
      name: "Demi-million",
      description: "500 000 FCFA cumulés",
      icon: Award,
      gradient: "from-purple-500 to-pink-500",
      target: 500000,
      current: ctx.totalAmount,
    },
    {
      id: "1m",
      name: "Millionnaire",
      description: "1 000 000 FCFA cumulés",
      icon: Crown,
      gradient: "from-yellow-400 to-amber-600",
      target: 1000000,
      current: ctx.totalAmount,
    },
    {
      id: "streak-3",
      name: "En forme",
      description: "3 mois consécutifs d'épargne",
      icon: Flame,
      gradient: "from-orange-500 to-red-500",
      target: 3,
      current: ctx.monthsActive,
    },
    {
      id: "streak-6",
      name: "Inarrêtable",
      description: "6 mois consécutifs d'épargne",
      icon: Flame,
      gradient: "from-red-500 to-pink-600",
      target: 6,
      current: ctx.monthsActive,
    },
    {
      id: "goal-master",
      name: "Maître des objectifs",
      description: "3 objectifs mensuels atteints",
      icon: Trophy,
      gradient: "from-violet-500 to-purple-600",
      target: 3,
      current: ctx.monthsWithGoalReached,
    },
  ];

  return defs.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    icon: d.icon,
    gradient: d.gradient,
    unlocked: d.current >= d.target,
    progress: Math.min(100, (d.current / d.target) * 100),
  }));
}
