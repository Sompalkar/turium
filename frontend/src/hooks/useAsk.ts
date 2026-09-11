import { useCallback, useRef, useState } from "react";
import { api, ApiError } from "../api/client.js";
import type { QueryResponse } from "../api/types.js";

interface UseAsk {
  result: QueryResponse | null;
  isAsking: boolean;
  error: string | null;
  ask: (question: string) => Promise<void>;
}

export function useAsk(): UseAsk {
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Answers take a few seconds, so a slow earlier reply must not overwrite a newer one.
  const latestRequest = useRef(0);

  const ask = useCallback(async (question: string) => {
    const requestId = ++latestRequest.current;
    setIsAsking(true);
    setError(null);

    try {
      const response = await api.query(question);
      if (requestId !== latestRequest.current) return;
      setResult(response);
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      setResult(null);
      setError(caught instanceof ApiError ? caught.message : "Could not answer that");
    } finally {
      if (requestId === latestRequest.current) setIsAsking(false);
    }
  }, []);

  return { result, isAsking, error, ask };
}
