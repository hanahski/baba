import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ToolPrice = { tool_key: string; label: string | null; cost: number };

export function useToolPrices() {
  return useQuery({
    queryKey: ["tool-prices"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.from("tool_prices" as any).select("tool_key,cost");
      if (error) return {};
      const map: Record<string, number> = {};
      (data as any[] | null)?.forEach((r) => { map[r.tool_key] = r.cost; });
      return map;
    },
    staleTime: 60_000,
  });
}

/** Fetches the current cost for a tool key, returns fallback if not set. */
export async function fetchToolCost(tool_key: string, fallback: number): Promise<number> {
  const { data } = await supabase
    .from("tool_prices" as any)
    .select("cost")
    .eq("tool_key", tool_key)
    .maybeSingle();
  const cost = (data as any)?.cost;
  return typeof cost === "number" ? cost : fallback;
}
