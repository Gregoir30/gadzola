import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import heroShopkeeper from "@/assets/hero-shopkeeper.jpg";

export default function Auth() {
  const navigate = useNavigate();
  const { user, primaryRole, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !primaryRole) return;
    const target =
      primaryRole === "admin" ? "/admin" : primaryRole === "collecteur" ? "/collecteur" : "/client";
    navigate(target, { replace: true });
  }, [user, primaryRole, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast({ title: "Connexion échouée", description: error.message, variant: "destructive" });
      return;
    }
    const { data: bootstrapData, error: bootstrapError } = await supabase.functions.invoke("bootstrap-admin");
    const bootstrapMessage = (bootstrapData as { error?: string; assigned?: boolean } | null)?.error;
    setLoading(false);
    if (!bootstrapError && (bootstrapData as { assigned?: boolean } | null)?.assigned) {
      toast({ title: "Bienvenue sur Gadzola", description: "Votre compte admin a été initialisé." });
      navigate("/admin", { replace: true });
      return;
    }
    if (bootstrapMessage) {
      toast({ title: "Connexion partielle", description: bootstrapMessage, variant: "destructive" });
      return;
    }
    toast({ title: "Bienvenue sur Gadzola" });
  };

  const handleSignupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: redirectUrl, data: { full_name: fullName } },
    });
    if (error) {
      setLoading(false);
      toast({ title: "Inscription échouée", description: error.message, variant: "destructive" });
      return;
    }
    const { data: bootstrapData, error: bootstrapError } = await supabase.functions.invoke("bootstrap-admin");
    const bootstrapPayload = bootstrapData as { error?: string; assigned?: boolean } | null;
    setLoading(false);
    if (bootstrapError || bootstrapPayload?.error) {
      toast({ title: "Compte créé", description: bootstrapPayload?.error ?? bootstrapError?.message ?? "Connectez-vous pour continuer." });
      return;
    }
    if (bootstrapPayload?.assigned) {
      toast({ title: "Compte administrateur créé", description: "Vous êtes le premier admin Gadzola." });
      navigate("/admin", { replace: true });
      return;
    }
    toast({ title: "Compte créé", description: "Un administrateur doit vous attribuer un rôle." });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-background">
      {/* Visual side */}
      <div className="relative hidden lg:block overflow-hidden">
        <img src={heroShopkeeper} alt="Gadzola" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-primary/20" />
        <div className="absolute inset-0 bg-primary/10 opacity-50" />

        <div className="relative h-full flex flex-col justify-between p-12 text-foreground">
          <Link to="/" className="flex items-center gap-2.5 w-fit">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-glow">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold">Gadzola</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-6 max-w-md"
          >
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
              <span>La fintech qui révolutionne la collecte africaine</span>
            </div>
            <h1 className="font-display text-4xl xl:text-5xl font-bold leading-tight">
              Bienvenue dans <span className="text-primary">votre carnet</span> intelligent.
            </h1>
            <p className="text-foreground/80 text-base leading-relaxed">
              Suivez chaque paiement, atteignez vos objectifs, débloquez des badges, et recevez
              des insights personnalisés générés par IA.
            </p>
          </motion.div>

          <p className="text-sm text-foreground/50">© {new Date().getFullYear()} Gadzola.</p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 md:p-12 relative">
        <div className="absolute top-4 left-4 lg:hidden">
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Accueil</Link>
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8 flex items-center gap-2.5 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-glow">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-2xl font-bold">Gadzola</span>
          </div>

          <div className="glass-strong rounded-2xl p-6 md:p-8 shadow-elegant">
            <h2 className="font-display text-2xl font-bold mb-1">Connexion</h2>
            <p className="text-sm text-muted-foreground mb-6">Accédez à votre espace sécurisé.</p>

            {user && !authLoading && !primaryRole && (
              <p className="mb-4 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm">
                Compte connecté, en attente d'attribution de rôle.
              </p>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-5 bg-muted/50">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Premier admin</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@gadzola.com" className="h-11 bg-background/60" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 bg-background/60" />
                  </div>
                  <Button type="submit" className="w-full h-11 bg-primary border-0 shadow-glow text-base text-primary-foreground hover:bg-primary/90" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Se connecter
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignupAdmin} className="space-y-4">
                  <p className="text-xs text-muted-foreground bg-primary/10 border border-primary/20 rounded-lg p-3">
                    Cette option crée le <strong>premier compte admin</strong>. Ensuite, les autres comptes sont créés depuis le dashboard.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="fullname">Nom complet</Label>
                    <Input id="fullname" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 bg-background/60" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-s">Email</Label>
                    <Input id="email-s" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-background/60" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-s">Mot de passe (min 8)</Label>
                    <Input id="password-s" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 bg-background/60" />
                  </div>
                  <Button type="submit" className="w-full h-11 bg-primary border-0 shadow-glow text-base text-primary-foreground hover:bg-primary/90" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Créer mon compte
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
