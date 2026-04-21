export function formatFCFA(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " FCFA";
}

export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const PAYMENT_METHODS = [
  { value: "cash", label: "Espèces (cash)" },
  { value: "mobile_money_orange", label: "Orange Money" },
  { value: "mobile_money_mtn", label: "MTN Mobile Money" },
  { value: "mobile_money_wave", label: "Wave" },
  { value: "mobile_money_moov", label: "Moov Money" },
] as const;

export function methodLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}
