import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck, Smartphone, BarChart3, Bell, Lock, ArrowRight, Check, Loader2,
  Sparkles, Zap, Trophy, BookOpen, Wallet, TrendingUp, Globe2, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import heroShopkeeper from "@/assets/hero-shopkeeper.jpg";
import heroPayment from "@/assets/hero-payment.jpg";
import heroSecurity from "@/assets/hero-security.jpg";

export default function Index() {
  const { user, primaryRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (user && primaryRole) {
    const target =
      primaryRole === "admin" ? "/admin" : primaryRole === "collecteur" ? "/collecteur" : "/client";
    return <Navigate to={target} replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 glass">
        <div className="container mx-auto flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
              <ShieldCheck className="h-5 w-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-white/20 blur-md -z-10" />
            </div>
            <span className="font-display text-xl font-bold">Gadzola</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#solution" className="hover:text-foreground transition-colors">Solution</a>
            <a href="#carnet" className="hover:text-foreground transition-colors">Carnet</a>
            <a href="#securite" className="hover:text-foreground transition-colors">Sécurité</a>
            <a href="#temoignages" className="hover:text-foreground transition-colors">Avis</a>
          </nav>
          <Button asChild className="gradient-primary border-0 shadow-glow hover:opacity-90">
            <Link to="/auth">Se connecter <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 gradient-mesh opacity-60 pointer-events-none" />
        <div className="absolute top-32 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />

        <div className="container mx-auto py-20 md:py-28 grid lg:grid-cols-2 gap-12 items-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-7"
          >
            <Badge className="gap-2 border-primary/40 bg-primary/10 text-primary-foreground backdrop-blur px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="text-foreground/90">La fintech de la collecte africaine</span>
            </Badge>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tighter">
              Votre argent,
              <br />
              <span className="text-gradient">dans un carnet</span>
              <br />
              vraiment intelligent.
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Gadzola digitalise la collecte d'argent dans toute l'Afrique. Carnet d'épargne animé,
              objectifs mensuels, badges, coach IA et notifications instantanées — tout dans la poche
              de vos clients.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gradient-primary border-0 shadow-glow text-base h-12 px-7 hover:scale-105 transition-transform">
                <Link to="/auth">
                  Démarrer gratuitement <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border/60 bg-card/40 backdrop-blur text-base h-12 px-7">
                <a href="#carnet">Voir le carnet</a>
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-2">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="h-9 w-9 rounded-full border-2 border-background bg-gradient-to-br from-primary to-primary-glow" />
                ))}
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-1 text-gold">
                  {[1,2,3,4,5].map((i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                </div>
                <div className="text-muted-foreground">+1 200 collecteurs déjà actifs</div>
              </div>
            </div>
          </motion.div>

          {/* Hero image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-8 bg-gradient-to-br from-primary/40 via-primary-glow/20 to-transparent blur-3xl" />

            <div className="relative rounded-3xl overflow-hidden shadow-elegant border border-border/40 ring-glow">
              <img
                src={heroShopkeeper}
                alt="Commerçante africaine utilisant Gadzola sur son téléphone"
                width={1920}
                height={1080}
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            </div>

            {/* Floating cards */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-4 top-12 glass-strong rounded-2xl p-4 shadow-elegant w-56 hidden md:block"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg gradient-success flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-semibold text-success">Paiement reçu</span>
              </div>
              <div className="text-2xl font-bold font-display">25 000 <span className="text-sm text-muted-foreground">FCFA</span></div>
              <div className="text-xs text-muted-foreground mt-1">TX-A8F3D2C1 • à l'instant</div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -right-4 bottom-8 glass-strong rounded-2xl p-4 shadow-elegant w-52 hidden md:block"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Trophy className="h-4 w-4 text-gold" />
                <span className="text-xs font-semibold">Objectif atteint 🎉</span>
              </div>
              <div className="text-xs text-muted-foreground mb-2">Octobre — 50 000 FCFA</div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-full gradient-success" />
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Stats bar */}
        <div className="container mx-auto pb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 glass rounded-2xl p-6 md:p-8">
            {[
              { v: "1 200+", l: "Collecteurs actifs" },
              { v: "85K", l: "Clients enregistrés" },
              { v: "2,4 Mds", l: "FCFA tracés" },
              { v: "99,9%", l: "Disponibilité" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="font-display text-2xl md:text-3xl font-bold text-gradient">{s.v}</div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section id="solution" className="container mx-auto py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" className="border-primary/40 text-primary mb-4">3 interfaces, 1 plateforme</Badge>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Pensé pour <span className="text-gradient">chaque acteur</span> de la collecte.
          </h2>
          <p className="text-muted-foreground text-lg">
            Du collecteur sur le terrain à l'administrateur au bureau, en passant par le client
            qui consulte son carnet — tout est connecté.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={Smartphone}
            badge="Collecteur"
            title="Encaisser en 5 secondes"
            text="Scan, montant, validation. La transaction est notifiée au client et tracée à vie."
            gradient="from-primary to-primary-glow"
          />
          <FeatureCard
            icon={BookOpen}
            badge="Client"
            title="Mon carnet animé"
            text="Timeline mensuelle, objectif, streak, badges. Voir mon argent grandir devient un jeu."
            gradient="from-pink-500 to-orange-500"
          />
          <FeatureCard
            icon={BarChart3}
            badge="Admin"
            title="Pilotage en temps réel"
            text="Heatmap d'activité, classement gamifié, insights IA. La performance, sous contrôle."
            gradient="from-cyan-500 to-blue-500"
          />
        </div>
      </section>

      {/* CARNET — image showcase */}
      <section id="carnet" className="relative py-24">
        <div className="absolute inset-0 gradient-mesh opacity-40 pointer-events-none" />
        <div className="container mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative order-2 lg:order-1"
            >
              <div className="absolute -inset-8 bg-gradient-to-tr from-success/30 via-primary/20 to-transparent blur-3xl" />
              <div className="relative rounded-3xl overflow-hidden shadow-elegant border border-border/40">
                <img
                  src={heroPayment}
                  alt="Échange de paiement entre un commerçant et un client"
                  width={1024}
                  height={1024}
                  loading="lazy"
                  className="w-full h-auto object-cover"
                />
              </div>
            </motion.div>

            <div className="space-y-6 order-1 lg:order-2">
              <Badge variant="outline" className="border-success/40 text-success">Nouveauté</Badge>
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                Le <span className="text-gradient">carnet d'épargne</span> qui motive vos clients.
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Fini les cahiers froissés. Chaque paiement devient une page animée, chaque mois un
                objectif, chaque série un streak. La gamification au service de l'épargne.
              </p>

              <ul className="space-y-3">
                {[
                  { icon: Target, t: "Objectif mensuel personnalisable" },
                  { icon: Zap, t: "Streak — mois consécutifs d'épargne" },
                  { icon: Trophy, t: "Badges débloqués automatiquement" },
                  { icon: Sparkles, t: "Coach IA personnalisé" },
                  { icon: Bell, t: "Notification temps réel à chaque paiement" },
                ].map(({ icon: Icon, t }) => (
                  <li key={t} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary text-white shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-foreground/90">{t}</span>
                  </li>
                ))}
              </ul>

              <Button asChild size="lg" className="gradient-primary border-0 shadow-glow">
                <Link to="/auth">Découvrir mon carnet <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* SECURITÉ */}
      <section id="securite" className="container mx-auto py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="outline" className="border-gold/40 text-gold">Sécurité maximale</Badge>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Chaque centime, <span className="text-gradient-gold">protégé.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Authentification par rôle, RLS au niveau base de données, traçabilité complète.
              Vos données financières bénéficient du niveau de sécurité d'une banque digitale.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 pt-4">
              <SecurityCard icon={Lock} title="Auth par rôle" text="Admin, collecteur, client — chacun son espace." />
              <SecurityCard icon={ShieldCheck} title="RLS de bout en bout" text="Sécurité au niveau base de données." />
              <SecurityCard icon={Bell} title="Traçabilité totale" text="Chaque action enregistrée et notifiée." />
              <SecurityCard icon={Globe2} title="API mobile" text="SDK pour Flutter, React Native, Kotlin." />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="absolute -inset-8 bg-gradient-to-br from-gold/30 via-primary/20 to-transparent blur-3xl" />
            <div className="relative rounded-3xl overflow-hidden border border-border/40 shadow-elegant ring-glow">
              <img
                src={heroSecurity}
                alt="Bouclier de sécurité Gadzola"
                width={1024}
                height={1024}
                loading="lazy"
                className="w-full h-auto object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      <section id="temoignages" className="container mx-auto py-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="border-primary/40 text-primary mb-4">Avis clients</Badge>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Ils ont <span className="text-gradient">transformé</span> leur collecte.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: "Aminata D.", role: "Collectrice — Dakar", text: "Avant, je perdais des heures à recompter. Maintenant tout est dans Gadzola. Mes clients sont rassurés." },
            { name: "Jean K.", role: "Tontine — Abidjan", text: "Le carnet que mes membres reçoivent change tout. Ils voient leur épargne grandir, ça les motive." },
            { name: "Fatou S.", role: "Admin coopérative", text: "Le tableau de bord et la heatmap me permettent enfin de piloter mon réseau de collecteurs en temps réel." },
          ].map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6 hover:shadow-glow transition-shadow"
            >
              <div className="flex items-center gap-1 text-gold mb-3">
                {[1,2,3,4,5].map((i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
              </div>
              <p className="text-foreground/90 leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border/40">
                <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto pb-24">
        <div className="relative rounded-3xl overflow-hidden gradient-primary shadow-elegant">
          <div className="absolute inset-0 grid-pattern opacity-20" />
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative p-10 md:p-16 text-center text-white space-y-6">
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
              Prêt à révolutionner votre collecte ?
            </h2>
            <p className="text-white/80 max-w-xl mx-auto text-lg">
              Rejoignez Gadzola en moins de 2 minutes. Votre premier compte est gratuit.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 h-12 px-7 text-base">
                <Link to="/auth">Démarrer maintenant <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white h-12 px-7 text-base">
                <a href="#solution">En savoir plus</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Gadzola — La fintech de la collecte africaine
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon, badge, title, text, gradient,
}: { icon: React.ComponentType<{ className?: string }>; badge: string; title: string; text: string; gradient: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full glass border-border/40 hover:border-primary/40 hover:shadow-glow transition-all group">
        <CardContent className="p-6 space-y-4">
          <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg group-hover:scale-110 transition-transform`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <Badge variant="outline" className="text-xs mb-2 border-border/60">{badge}</Badge>
            <h3 className="font-display text-xl font-bold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SecurityCard({
  icon: Icon, title, text,
}: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <div className="glass rounded-xl p-4 hover:border-gold/40 transition-colors">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-gold text-foreground shadow-md mb-3">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

// Lucide doesn't have Target imported; alias
function Target(props: { className?: string }) {
  return <TrendingUp {...props} />;
}
