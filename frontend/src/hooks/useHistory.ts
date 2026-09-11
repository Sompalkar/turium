import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../api/client.js";
import type { QueryResponse } from "../api/types.js";

interface UseHistory {
  queries: QueryResponse[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  clear: () => Promise<void>;
}

// Past questions live on the server, so they survive a refresh and a new browser.
export function useHistory(): UseHistory {
  const [queries, setQueries] = useState<QueryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const response = await api.listQueries();
      setQueries(response.queries);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load past questions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(async () => {
    try {
      await api.clearQueries();
      setQueries([]);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not clear history");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { queries, isLoading, error, reload, clear };
}
