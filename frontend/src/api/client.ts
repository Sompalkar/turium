import type {
  HistoryResponse,
  IngestRequest,
  ItemDetail,
  ItemListResponse,
  ItemSummary,
  QueryResponse,
} from "./types.js";

// Empty in development, where Vite proxies /api. Set to the deployed API origin
// at build time, because Vite inlines it into the bundle.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

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
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(
      0,
      "network_error",
      BASE_URL ? `Could not reach the API at ${BASE_URL}` : "Could not reach the server. Is it running on port 4000?",
    );
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

  getItem: (id: string) => request<{ item: ItemDetail }>(`/api/items/${id}`),

  deleteItem: (id: string) => request<{ deleted: string }>(`/api/items/${id}`, { method: "DELETE" }),

  ingest: (body: IngestRequest) =>
    request<{ item: ItemSummary }>("/api/ingest", { method: "POST", body: JSON.stringify(body) }),

  query: (question: string) =>
    request<QueryResponse>("/api/query", { method: "POST", body: JSON.stringify({ question }) }),

  listQueries: (limit = 20) => request<HistoryResponse>(`/api/queries?limit=${limit}`),

  clearQueries: () => request<{ deleted: number }>("/api/queries", { method: "DELETE" }),
};
