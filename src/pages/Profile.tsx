import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, UserCircle2, ShieldCheck, Mail } from "lucide-react";

const roleLabel: Record<"admin" | "collecteur" | "client", string> = {
  admin: "Administrateur",
  collecteur: "Collecteur",
  client: "Client",
};

export default function Profile() {
  const { user, profile, roles, primaryRole } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? user?.user_metadata?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile, user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    const [{ error: profileError }, { error: authError }] = await Promise.all([
      supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: trimmedName || null,
          email: user.email ?? null,
          phone: trimmedPhone || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      ),
      supabase.auth.updateUser({
        data: { full_name: trimmedName || (user.email ?? "") },
      }),
    ]);

    setSaving(false);

    if (profileError) {
      toast.error("Profil non sauvegardé", { description: profileError.message });
      return;
    }

    if (authError) {
      toast.warning("Profil partiellement mis à jour", {
        description: "La base de données a été enregistrée, mais les métadonnées auth n'ont pas pu être synchronisées.",
      });
      return;
    }

    toast.success("Profil mis à jour");
  };

  return (
    <AppShell>
      <div className="max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl bg-primary p-6 text-primary-foreground shadow-elegant md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <UserCircle2 className="h-8 w-8" />
            </div>
            <div>
              <div className="text-white/75 text-sm">Mon profil</div>
              <h1 className="font-display text-3xl font-bold">{profile?.full_name ?? user?.email ?? "Utilisateur"}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                {primaryRole && <Badge className="bg-white/15 text-white border-white/20">{roleLabel[primaryRole]}</Badge>}
                {roles.length > 1 && <Badge className="bg-white/15 text-white border-white/20">Multi-rôle</Badge>}
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/90 backdrop-blur">
            Modifie ton nom et ton numéro depuis un seul endroit.
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Informations personnelles
              </CardTitle>
              <CardDescription>Ces données alimentent ton affichage dans l’application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nom complet</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ton nom complet"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+225 07 00 00 00 00"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{user?.email ?? "—"}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFullName(profile?.full_name ?? user?.user_metadata?.full_name ?? "");
                    setPhone(profile?.phone ?? "");
                  }}
                  disabled={saving}
                >
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-primary border-0 shadow-glow text-primary-foreground hover:bg-primary/90">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Résumé du compte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
                    {(profile?.full_name ?? user?.email ?? "U")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{profile?.full_name ?? user?.email ?? "Utilisateur"}</div>
                    <div className="text-sm text-muted-foreground truncate">{user?.email ?? "—"}</div>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-3 py-2">
                    <span className="text-muted-foreground">Rôle principal</span>
                    <span className="font-medium">{primaryRole ? roleLabel[primaryRole] : "Aucun"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-3 py-2">
                    <span className="text-muted-foreground">Téléphone</span>
                    <span className="font-medium">{profile?.phone ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-3 py-2">
                    <span className="text-muted-foreground">ID utilisateur</span>
                    <span className="max-w-[180px] truncate font-mono text-xs">{user?.id ?? "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Rôles attribués</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <Badge key={role} variant="outline" className="border-primary/30 text-primary">
                      {roleLabel[role]}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun rôle trouvé pour ce compte.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
