import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Smartphone, QrCode, Loader2, Sparkles, Waves, WalletCards } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Import logos
import moovLogo from "@/assets/paiement/moov.png";
import mixxByYasLogo from "@/assets/paiement/mixx-by-yas.svg";

declare global {
  interface Window {
    FedaPay: any;
  }
}

type PaymentMethod = "mobile_money_mtn" | "mobile_money_moov" | "mobile_money_orange" | "mobile_money_wave";

const PAYMENT_OPTIONS: Array<{
  value: PaymentMethod;
  label: string;
  helper: string;
  logoSrc?: string;
  icon?: typeof WalletCards;
  badgeClass: string;
}> = [
  {
    value: "mobile_money_mtn",
    label: "Mixx by Yas",
    helper: "Togocom / Yas",
    logoSrc: mixxByYasLogo,
    badgeClass: "bg-[#ff6a13]/10 text-[#ff6a13] border-[#ff6a13]/20",
  },
  {
    value: "mobile_money_moov",
    label: "Moov Money",
    helper: "Moov Africa",
    logoSrc: moovLogo,
    badgeClass: "bg-[#0b8f74]/10 text-[#0b8f74] border-[#0b8f74]/20",
  },
  {
    value: "mobile_money_orange",
    label: "Orange Money",
    helper: "Compte Orange Money",
    icon: WalletCards,
    badgeClass: "bg-[#ff7900]/10 text-[#ff7900] border-[#ff7900]/20",
  },
  {
    value: "mobile_money_wave",
    label: "Wave",
    helper: "Paiement mobile Wave",
    icon: Waves,
    badgeClass: "bg-[#1f6bff]/10 text-[#1f6bff] border-[#1f6bff]/20",
  },
];

export default function ClientPayer() {
  const { user, profile } = useAuth();
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      void (async () => {
        const { data, error } = await supabase
          .from("clients")
          .select("id, full_name, phone")
          .eq("profile_id", user.id)
          .single();
        if (error) {
          console.error("Erreur chargement client pour QR:", error);
        }
        if (data) {
          setClientId(data.id);
          setClientData({
            ...data,
            email: profile?.email ?? user.email ?? null,
          });
        }
        setLoading(false);
      })();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const handlePayment = (method: PaymentMethod) => {
    if (!amount || isNaN(Number(amount)) || Number(amount) < 100) {
      toast.error("Veuillez entrer un montant valide (minimum 100 FCFA).");
      return;
    }

    if (!window.FedaPay) {
      toast.error("Le module de paiement n'est pas chargé. Veuillez rafraîchir la page.");
      return;
    }

    const fedapayKey = import.meta.env.VITE_FEDAPAY_PUBLIC_KEY;
    if (!fedapayKey) {
      toast.error("Configuration FedaPay manquante.");
      return;
    }

    setIsProcessing(true);

    const selectedMethod = PAYMENT_OPTIONS.find((option) => option.value === method);
    const methodLabel = selectedMethod?.label ?? "Mobile Money";

    const names = clientData?.full_name?.split(" ") || ["Client", ""];
    const firstname = names[0];
    const lastname = names.slice(1).join(" ") || "Gadzola";

    const widget = window.FedaPay.init({
      public_key: fedapayKey,
      transaction: {
        amount: Number(amount),
        description: `Paiement Gadzola - ${clientData?.full_name || "Client"} - ${methodLabel}`,
      },
      customer: {
        email: clientData?.email || "client@gadzola.com",
        lastname: lastname,
        firstname: firstname,
        phone_number: {
          number: clientData?.phone || "",
          country: "tg" // "tg" pour Togo ou "bj" pour Bénin
        }
      },
      onComplete: async (resp: any) => {
        const reason = resp.reason;
        setIsProcessing(false);

        if (reason === window.FedaPay.DIALOG_DISMISSED) {
          toast.info("Paiement annulé.");
        } else {
          toast.info("Validation du paiement en cours...");
          
          // Appeler l'Edge Function pour vérifier et enregistrer la transaction
          try {
            const { data, error } = await supabase.functions.invoke("verify-fedapay-transaction", {
              body: { 
                transactionId: resp.transaction.id,
                clientId: clientId,
                method,
                amount: Number(amount)
              }
            });

            if (error) throw error;
            
            toast.success("Paiement réussi et enregistré !");
            setAmount("");
          } catch (err) {
            console.error("Erreur vérification FedaPay:", err);
            toast.error("Le paiement a réussi mais l'enregistrement a échoué. Veuillez contacter le support.");
          }
        }
      }
    });

    widget.open();
  };

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
                  <div className="absolute -inset-4 bg-primary/10 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
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
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Entrez le montant et choisissez votre méthode de paiement pour recharger votre compte.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Montant (FCFA)</label>
                <Input 
                  type="number" 
                  placeholder="Ex: 5000" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-lg"
                  min="100"
                />
              </div>

              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                {PAYMENT_OPTIONS.map((option) => {
                  const Icon = option.icon;

                  return (
                    <Button
                      key={option.value}
                      variant="outline"
                      className="h-auto min-h-32 justify-start rounded-2xl border-2 px-4 py-4 text-left hover:border-primary hover:bg-primary/5 transition-all"
                      onClick={() => handlePayment(option.value)}
                      disabled={isProcessing}
                    >
                      <div className="flex w-full items-center gap-4">
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${option.badgeClass}`}>
                          {option.logoSrc ? (
                            <img src={option.logoSrc} alt={option.label} className="h-9 w-9 object-contain" />
                          ) : Icon ? (
                            <Icon className="h-7 w-7" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold leading-tight">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.helper}</p>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Le parcours de paiement est ouvert via FedaPay. La disponibilite des reseaux peut varier selon
                  votre numero, votre operateur et la configuration active de votre compte marchand.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-accent/30 border-accent">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-2">💡 Comment ça marche aujourd'hui</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Entrez le montant que vous souhaitez payer.</li>
              <li>Choisissez Mixx by Yas, Moov Money, Orange Money ou Wave.</li>
              <li>Validez le paiement sur votre téléphone.</li>
              <li>La transaction sera enregistrée automatiquement.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
