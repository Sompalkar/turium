import type { IngestRequest, ItemListResponse, ItemSummary, QueryResponse } from "./types.js";

interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
  requestId?: string;
}

// Carries the server's own message so the UI never has to invent one.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "network_error", "Could not reach the server. Is it running on port 4000?");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      body?.error.code ?? "unknown_error",
      body?.error.message ?? `Request failed with status ${response.status}`,
      body?.requestId,
    );
  }

  return (await response.json()) as T;
}

export const api = {
  listItems: (limit = 50) => request<ItemListResponse>(`/api/items?limit=${limit}`),

  ingest: (body: IngestRequest) =>
    request<{ item: ItemSummary }>("/api/ingest", { method: "POST", body: JSON.stringify(body) }),

  query: (question: string) =>
    request<QueryResponse>("/api/query", { method: "POST", body: JSON.stringify({ question }) }),
};
