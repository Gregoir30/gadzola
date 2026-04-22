import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LogOut,
  LayoutDashboard,
  Users,
  Wallet,
  Bell,
  History,
  QrCode,
  BookOpen,
  Trophy,
  Settings,
  UserCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { useBranding } from "@/contexts/BrandingContext";
import { ThemeToggle } from "./ThemeToggle";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navByRole: Record<AppRole, NavItem[]> = {
  admin: [
    { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
    { to: "/admin/leaderboard", label: "Classement", icon: Trophy },
    { to: "/admin/collecteurs", label: "Collecteurs", icon: Users },
    { to: "/admin/clients", label: "Clients", icon: Users },
    { to: "/admin/transactions", label: "Transactions", icon: Wallet },
    { to: "/admin/notifications", label: "Notifications", icon: Bell },
    { to: "/admin/settings", label: "Paramètres", icon: Settings },
  ],
  collecteur: [
    { to: "/collecteur", label: "Tableau de bord", icon: LayoutDashboard },
    { to: "/collecteur/encaisser", label: "Encaisser", icon: Wallet },
    { to: "/collecteur/historique", label: "Historique", icon: History },
  ],
  client: [
    { to: "/client", label: "Mon espace", icon: LayoutDashboard },
    { to: "/client/carnet", label: "Mon carnet", icon: BookOpen },
    { to: "/client/transactions", label: "Mes paiements", icon: History },
    { to: "/client/payer", label: "Payer", icon: QrCode },
  ],
};

const roleLabels: Record<AppRole, string> = {
  admin: "Administrateur",
  collecteur: "Collecteur",
  client: "Client",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { primaryRole, user, profile } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();

  const items = primaryRole ? [...navByRole[primaryRole], { to: "/profile", label: "Mon profil", icon: UserCircle2 }] : [];
  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email ?? "Utilisateur";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex border-r border-sidebar-border relative">
        <div className="absolute inset-0 gradient-mesh opacity-30 pointer-events-none" />

        <Link to="/" className="relative flex items-center gap-2.5 px-6 py-5 border-b border-sidebar-border">
          <BrandLogo size="md" />
          <div>
            <div className="font-display text-lg font-bold leading-none">{branding.app_name}</div>
            <div className="text-xs text-sidebar-foreground/60 mt-0.5">
              {primaryRole ? roleLabels[primaryRole] : ""}
            </div>
          </div>
        </Link>

        <nav className="relative flex-1 space-y-1 px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === `/${primaryRole}`}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group",
                  isActive
                    ? "bg-gradient-to-r from-primary/30 to-primary/10 text-foreground shadow-glow"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full gradient-primary" />
                  )}
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="relative border-t border-sidebar-border p-3 space-y-1">
          <Link to="/profile" className="block rounded-xl px-3 py-2 transition-colors hover:bg-sidebar-accent/60">
            <div className="text-sm font-semibold text-sidebar-foreground truncate">{displayName}</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
          </Link>
          <ThemeToggle className="mt-2" />
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 relative">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/40 glass px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <span className="font-display font-bold">{branding.app_name}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle showLabel={false} className="p-1 hover:bg-transparent" />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="sticky top-[57px] z-20 flex gap-1 overflow-x-auto border-b border-border/40 glass px-3 py-2 md:hidden scrollbar-none">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === `/${primaryRole}`}
              className={({ isActive }) =>
                cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  isActive
                    ? "gradient-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 md:p-8 animate-fade-in relative">{children}</div>
      </main>
    </div>
  );
}
