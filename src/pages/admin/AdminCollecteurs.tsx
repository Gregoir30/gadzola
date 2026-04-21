import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Plus, 
  UserCheck, 
  Shield, 
  Phone, 
  Mail, 
  MoreVertical, 
  Eye, 
  Edit2, 
  Trash2, 
  Snowflake,
  AlertTriangle
} from "lucide-react";
import { formatDate } from "@/lib/format";
import type { AppRole } from "@/hooks/useAuth";

const userSchema = z.object({
  fullName: z.string().min(2, "Le nom doit avoir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  password: z.string().min(8, "Le mot de passe doit avoir au moins 8 caractères"),
});

const editUserSchema = z.object({
  fullName: z.string().min(2, "Le nom doit avoir au moins 2 caractères"),
  phone: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;
type EditUserFormValues = z.infer<typeof editUserSchema>;

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  is_suspended?: boolean;
}

function ManageUserSheet({ 
  user, 
  isOpen, 
  onClose, 
  onUpdate 
}: { 
  user: UserRow | null; 
  isOpen: boolean; 
  onClose: () => void;
  onUpdate: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    values: {
      fullName: user?.full_name ?? "",
      phone: user?.phone ?? "",
    },
  });

  const handleUpdate = async (values: EditUserFormValues) => {
    if (!user) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { 
        action: "UPDATE", 
        userId: user.id, 
        payload: { full_name: values.fullName, phone: values.phone }
      },
    });
    setSubmitting(false);
    if (error || (data && data.error)) {
      toast({ title: "Mise à jour échouée", description: data?.error ?? error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Profil mis à jour" });
    await onUpdate();
    onClose();
  };

  const handleToggleSuspend = async () => {
    if (!user) return;
    setSubmitting(true);
    const newStatus = !user.is_suspended;
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { 
        action: "TOGGLE_SUSPEND", 
        userId: user.id, 
        payload: { is_suspended: newStatus }
      },
    });
    setSubmitting(false);
    if (error || (data && data.error)) {
      toast({ title: "Action échouée", description: data?.error ?? error?.message, variant: "destructive" });
      return;
    }
    toast({ 
      title: newStatus ? "Compte gelé" : "Compte activé",
      description: newStatus ? "L'utilisateur ne peut plus se connecter." : "L'accès est rétabli."
    });
    await onUpdate();
    onClose();
  };

  const handleDelete = async () => {
    if (!user) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-user", {
      body: { action: "DELETE", userId: user.id },
    });
    setSubmitting(false);
    if (error || (data && data.error)) {
      toast({ 
        title: "Suppression impossible", 
        description: data?.error ?? error?.message, 
        variant: "destructive" 
      });
      return;
    }
    toast({ title: "Compte supprimé définitivement" });
    await onUpdate();
    onClose();
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-xl">Gérer l'utilisateur</SheetTitle>
            <SheetDescription>
              Modifiez les détails, suspendez ou supprimez ce compte.
            </SheetDescription>
          </SheetHeader>

          {user && (
            <div className="space-y-8">
              {/* Profil Summary */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  {(user.full_name || "U")[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-bold">{user.full_name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{user.id}</div>
                  <div className="mt-1">
                    <Badge variant={user.is_suspended ? "destructive" : "success"} className="text-[10px]">
                      {user.is_suspended ? "Gelé / Inactif" : "Actif"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <Edit2 className="h-4 w-4" /> Informations générales
                  </div>
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+225..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                    <Mail className="h-3 w-3" /> L'email ({user.email}) ne peut pas être modifié ici.
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer les modifications
                  </Button>
                </form>
              </Form>

              <div className="h-px bg-border" />

              {/* Actions Section */}
              <div className="space-y-4">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Sécurité et Statut
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Geler le compte</div>
                    <div className="text-xs text-muted-foreground">Empêche toute connexion ou action.</div>
                  </div>
                  <Switch 
                    checked={user.is_suspended} 
                    onCheckedChange={handleToggleSuspend} 
                    disabled={submitting}
                  />
                </div>

                <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 space-y-3">
                  <div className="text-sm font-bold text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Zone de danger
                  </div>
                  <p className="text-xs text-muted-foreground">
                    La suppression est irréversible. Elle sera bloquée si l'utilisateur possède un historique de transactions.
                  </p>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-full" 
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={submitting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer le compte
                  </Button>
                </div>
              </div>
            </div>
          )}

          <SheetFooter className="mt-8">
            <Button variant="outline" onClick={onClose} className="w-full">Fermer</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement le compte de <strong>{user?.full_name}</strong>. 
              Si des transactions sont liées à ce compte, la suppression échouera pour préserver l'intégrité des données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Oui, supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function UserManagement({ role, title, subtitle }: { role: Extract<AppRole, "collecteur" | "client">; title: string; subtitle: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const load = async () => {
    setLoading(true);
    console.log(`[UserManagement] Loading users for role: ${role}...`);

    const { data: roleRows, error: roleError } = await supabase.from("user_roles").select("user_id").eq("role", role);
    
    if (roleError) {
      console.error("[UserManagement] Error fetching user_roles:", roleError);
      setLoading(false);
      return;
    }

    const ids = (roleRows ?? []).map((r) => r.user_id);
    console.log(`[UserManagement] Found ${ids.length} user IDs with role ${role}:`, ids);

    if (ids.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    // Try fetching with is_suspended (new column)
    let { data, error } = await (supabase
      .from("profiles")
      .select("id, full_name, email, phone, created_at, is_suspended") as any)
      .in("id", ids)
      .order("created_at", { ascending: false });

    // Fallback if column doesn't exist yet
    if (error && error.message?.includes("is_suspended")) {
      console.warn("[UserManagement] is_suspended column missing, falling back to basic profile query.");
      const fallback = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, created_at")
        .in("id", ids)
        .order("created_at", { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error("[UserManagement] Final profile fetch error:", error);
    }

    console.log(`[UserManagement] Profiles fetched:`, data);
    setUsers(data ?? []);
    setLoading(false);
  };

  const handleCreate = async (values: UserFormValues) => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { 
        email: values.email, 
        password: values.password, 
        full_name: values.fullName, 
        phone: values.phone, 
        role 
      },
    });
    setSubmitting(false);
    if (error || (data && (data as { error?: string }).error)) {
      const msg = (data as { error?: string } | null)?.error ?? error?.message ?? "Erreur";
      toast({ title: "Création échouée", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: `${role === "collecteur" ? "Collecteur" : "Client"} créé avec succès` });
    setOpen(false);
    form.reset();
    await load();
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg hover:shadow-primary/20 transition-all">
                <Plus className="mr-2 h-4 w-4" />
                Nouveau {role === "collecteur" ? "collecteur" : "client"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Créer un {role === "collecteur" ? "collecteur" : "client"}</DialogTitle>
                <DialogDescription>
                  Le compte sera immédiatement actif. Communiquez les identifiants à l'utilisateur.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4 py-2">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input placeholder="Jean Dupont" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="jean@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone</FormLabel>
                          <FormControl>
                            <Input placeholder="+225…" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe (min 8)</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Créer le compte
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none shadow-premium overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <UserCheck className="h-4 w-4 text-primary" /> {users.length} {role === "collecteur" ? "collecteur(s)" : "client(s)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                <p className="text-sm">Chargement des {role}s…</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm text-muted-foreground">Aucun {role} enregistré pour le moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/20 border-b">
                      <th className="px-6 py-4 font-bold">Utilisateur</th>
                      <th className="px-6 py-4 font-bold">Contact</th>
                      <th className="px-6 py-4 font-bold">Date de création</th>
                      <th className="px-6 py-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((u) => (
                      <tr key={u.id} className={`hover:bg-muted/10 transition-colors group ${u.is_suspended ? 'bg-destructive/5 grayscale-[0.5]' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${u.is_suspended ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                              {(u.full_name || "U")[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{u.full_name ?? "—"}</span>
                                {u.is_suspended && (
                                  <Badge variant="destructive" className="h-4 text-[8px] px-1 font-bold uppercase">Gelé</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Shield className="h-3 w-3" /> ID: {u.id.slice(0, 8)}…
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 text-primary/60" /> {u.email}
                            </div>
                            {u.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3 text-primary/60" /> {u.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {formatDate(u.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 hover:bg-primary hover:text-white"
                            onClick={() => setSelectedUser(u)}
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                            Gérer
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ManageUserSheet 
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onUpdate={load}
      />
    </AppShell>
  );
}

export default function AdminCollecteurs() {
  return (
    <UserManagement
      role="collecteur"
      title="Collecteurs"
      subtitle="Gérez les comptes collecteurs autorisés à enregistrer des transactions."
    />
  );
}
