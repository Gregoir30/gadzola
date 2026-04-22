import { supabase } from "@/integrations/supabase/client";

export interface OfflineQueuedTransaction {
  id: string;
  client_id: string;
  amount: number;
  method: "cash" | "mobile_money_orange" | "mobile_money_mtn" | "mobile_money_wave" | "mobile_money_moov";
  notes: string | null;
  created_at: string;
}

const STORAGE_KEY = "gadzola-offline-transactions";

export function loadOfflineTransactions(): OfflineQueuedTransaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineQueuedTransaction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOfflineTransactions(items: OfflineQueuedTransaction[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function enqueueOfflineTransaction(
  payload: Omit<OfflineQueuedTransaction, "id" | "created_at">,
) {
  const current = loadOfflineTransactions();
  const next: OfflineQueuedTransaction = {
    ...payload,
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
  };
  saveOfflineTransactions([...current, next]);
  return next;
}

export function removeOfflineTransaction(id: string) {
  const current = loadOfflineTransactions();
  saveOfflineTransactions(current.filter((item) => item.id !== id));
}

export async function syncOfflineTransactions() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, remaining: loadOfflineTransactions().length };
  }

  const queue = loadOfflineTransactions();
  let synced = 0;
  for (const item of queue) {
    const { error } = await supabase.rpc("record_transaction", {
      _client_id: item.client_id,
      _amount: item.amount,
      _method: item.method,
      _notes: item.notes,
    });
    if (error) {
      break;
    }
    removeOfflineTransaction(item.id);
    synced += 1;
  }

  return { synced, remaining: loadOfflineTransactions().length };
}
