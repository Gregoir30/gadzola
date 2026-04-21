import { Navigate } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, primaryRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (allowedRoles && primaryRole && !allowedRoles.includes(primaryRole)) {
    // Redirige vers son propre espace
    const target =
      primaryRole === "admin" ? "/admin" : primaryRole === "collecteur" ? "/collecteur" : "/client";
    return <Navigate to={target} replace />;
  }

  if (!primaryRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div className="max-w-md space-y-3">
          <h2 className="text-xl font-semibold">Aucun rôle attribué</h2>
          <p className="text-sm text-muted-foreground">
            Votre compte n'a pas encore de rôle. Contactez l'administrateur Gadzola.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
