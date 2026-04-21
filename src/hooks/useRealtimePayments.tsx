import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { formatFCFA } from "@/lib/format";

/**
 * Realtime: écoute les nouvelles transactions pour un client donné.
 * Joue un son léger + toast animé.
 */
export function useRealtimePayments(clientId: string | null, onNewPayment?: () => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!clientId) return;

    // Son léger via WebAudio (pas de fichier externe)
    const playSound = () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine";
        o.frequency.setValueAtTime(880, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        o.start(); o.stop(ctx.currentTime + 0.4);
      } catch { /* silent */ }
    };

    const channel = supabase
      .channel(`client-tx-${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const tx = payload.new as { amount: number; reference: string };
          playSound();
          toast.success(`Paiement reçu : ${formatFCFA(Number(tx.amount))}`, {
            description: `Réf. ${tx.reference}`,
            icon: <CheckCircle2 className="h-5 w-5 text-success" />,
            duration: 6000,
          });
          onNewPayment?.();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, onNewPayment]);

  return audioRef;
}
