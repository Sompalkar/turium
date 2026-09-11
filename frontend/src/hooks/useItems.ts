import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../api/client.js";
import type { ItemSummary } from "../api/types.js";

interface UseItems {
  items: ItemSummary[];
  total: number;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

// Items are server state, so the server stays the source of truth and we refetch
// after a write rather than guessing what the new list looks like.
export function useItems(): UseItems {
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.listItems();
      setItems(response.items);
      setTotal(response.pagination.total);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load your saved items");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, total, isLoading, error, reload };
}
