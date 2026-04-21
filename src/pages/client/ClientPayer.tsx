import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Smartphone, QrCode, Loader2, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

const providers = [
  { name: "Orange Money", color: "bg-[#FF7900]", initials: "OM" },
  { name: "MTN Mobile Money", color: "bg-[#FFCB05] text-foreground", initials: "MTN" },
  { name: "Wave", color: "bg-[#1DC8FF]", initials: "W" },
  { name: "Moov Money", color: "bg-[#0066B3]", initials: "MM" },
];

export default function ClientPayer() {
  const { user } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      void (async () => {
        const { data } = await supabase
          .from("clients")
          .select("id")
          .eq("profile_id", user.id)
          .single();
        if (data) setClientId(data.id);
        setLoading(false);
      })();
    }
  }, [user]);
  return (
    <AppShell>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Payer</h1>
          <p className="text-muted-foreground">
            Réglez votre collecte directement depuis votre espace.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-primary/30 shadow-premium overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <QrCode className="h-32 w-32" />
            </div>
            <CardHeader>
              <div className="flex items-center gap-2 text-primary mb-1">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Accélérer ma transaction</span>
              </div>
              <CardTitle className="flex items-center gap-2 text-xl">
                Ma Carte Gadzola
              </CardTitle>
              <CardDescription>
                Présentez ce code à votre collecteur pour qu'il puisse vous identifier instantanément.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              {loading ? (
                <div className="h-48 w-48 flex items-center justify-center border-2 border-dashed rounded-2xl">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                </div>
              ) : clientId ? (
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-primary/0 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative bg-white p-6 rounded-[2rem] shadow-glow border-4 border-primary/10">
                    <QRCodeSVG 
                      value={`GZ_CLIENT:${clientId}`} 
                      size={180} 
                      level="H" 
                      includeMargin={false}
                      imageSettings={{
                        src: "/favicon.ico",
                        x: undefined,
                        y: undefined,
                        height: 30,
                        width: 30,
                        excavate: true,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-destructive">Erreur lors de la génération du code.</p>
              )}
              
              <div className="mt-8 text-center bg-muted/50 px-4 py-2 rounded-full border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-2">
                   <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Scanner actif • Sécurisé
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4" /> Paiement Mobile Money
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              L'intégration Mobile Money sera bientôt disponible. Pour l'instant, présentez-vous
              à votre collecteur avec votre paiement (espèces ou Mobile Money) — il enregistrera
              la transaction et vous recevrez une notification WhatsApp instantanée.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {providers.map((p) => (
                <div
                  key={p.name}
                  className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 opacity-70"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-white font-bold text-sm ${p.color}`}
                  >
                    {p.initials}
                  </div>
                  <span className="text-xs text-center font-medium">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground">Bientôt</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-accent/30 border-accent">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-2">💡 Comment ça marche aujourd'hui</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Remettez votre paiement à votre collecteur (cash ou Mobile Money manuel).</li>
              <li>Le collecteur enregistre la transaction sur Gadzola.</li>
              <li>Vous recevez une notification WhatsApp avec la référence et le montant.</li>
              <li>L'historique est consultable à tout moment dans « Mes paiements ».</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
