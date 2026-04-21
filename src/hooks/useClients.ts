import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Client = Tables<"clients">;

interface UseClientsOptions {
  search?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useClients({
  search = "",
  page = 1,
  pageSize = 20,
  enabled = true,
}: UseClientsOptions = {}) {
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounce search to avoid too many requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  return useQuery({
    queryKey: ["clients", debouncedSearch, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("*", { count: "exact" })
        .order("full_name", { ascending: true });

      if (debouncedSearch) {
        // Search in full_name OR phone using or() or filter
        query = query.or(`full_name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        clients: data as Client[],
        total: count || 0,
        hasMore: (count || 0) > to + 1,
      };
    },
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
}
