import { useCallback, useRef, useState } from "react";
import { api, ApiError } from "../api/client.js";
import type { QueryResponse } from "../api/types.js";

interface UseAsk {
  isAsking: boolean;
  error: string | null;
  ask: (question: string) => Promise<QueryResponse | null>;
}

export function useAsk(): UseAsk {
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Answers take a few seconds, so a slow earlier reply must not land after a newer one.
  const latestRequest = useRef(0);

  const ask = useCallback(async (question: string): Promise<QueryResponse | null> => {
    const requestId = ++latestRequest.current;
    setIsAsking(true);
    setError(null);

    try {
      const response = await api.query(question);
      if (requestId !== latestRequest.current) return null;
      return response;
    } catch (caught) {
      if (requestId !== latestRequest.current) return null;
      setError(caught instanceof ApiError ? caught.message : "Could not answer that");
      return null;
    } finally {
      if (requestId === latestRequest.current) setIsAsking(false);
    }
  }, []);

  return { isAsking, error, ask };
}
