import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TransactionExtended {
  id: string;
  amount: number;
  method: string;
  reference: string;
  created_at: string;
  status: string;
  notes: string | null;
  client_id: string;
  collector_id: string;
  client_name: string;
  collector_name: string;
}

interface UseTransactionsOptions {
  search?: string;
  page?: number;
  pageSize?: number;
  clientId?: string;
  collectorId?: string;
}

export function useTransactions({
  search = "",
  page = 1,
  pageSize = 20,
  clientId,
  collectorId,
}: UseTransactionsOptions = {}) {
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  return useQuery({
    queryKey: ["transactions", debouncedSearch, page, pageSize, clientId, collectorId],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (debouncedSearch) {
        query = query.ilike("reference", `%${debouncedSearch}%`);
      }
      if (clientId) {
        query = query.eq("client_id", clientId);
      }
      if (collectorId) {
        query = query.eq("collector_id", collectorId);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: rawData, error, count } = await query;
      if (error) throw error;

      const list = rawData || [];
      
      // Resolve names
      const uniqueCollectorIds = [...new Set(list.map((t) => t.collector_id))];
      const uniqueClientIds = [...new Set(list.map((t) => t.client_id))];

      const [{ data: profiles }, { data: clientRecs }] = await Promise.all([
        uniqueCollectorIds.length
          ? supabase.from("profiles").select("id, full_name").in("id", uniqueCollectorIds)
          : Promise.resolve({ data: [] }),
        uniqueClientIds.length
          ? supabase.from("clients").select("id, full_name").in("id", uniqueClientIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "—"]));
      const clientMap = new Map((clientRecs ?? []).map((c) => [c.id, c.full_name]));

      const extendedData: TransactionExtended[] = list.map((t) => ({
        ...t,
        amount: Number(t.amount),
        client_name: clientMap.get(t.client_id) ?? "—",
        collector_name: profileMap.get(t.collector_id) ?? "—",
      }));

      return {
        transactions: extendedData,
        total: count || 0,
        hasMore: (count || 0) > to + 1,
      };
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}
