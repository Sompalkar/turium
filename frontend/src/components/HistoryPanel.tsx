import { useEffect, useState } from "react";
import type { QueryResponse } from "../api/types.js";
import { EmptyState } from "./ui/EmptyState.js";
import { ErrorNote } from "./ui/ErrorNote.js";
import { Panel } from "./ui/Panel.js";

interface Props {
  queries: QueryResponse[];
  isLoading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (query: QueryResponse) => void;
  onClear: () => Promise<void>;
}

export function HistoryPanel({ queries, isLoading, error, selectedId, onSelect, onClear }: Props) {
  const [isConfirming, setIsConfirming] = useState(false);

  // Asking twice is enough of a guard for a destructive button.
  useEffect(() => {
    if (!isConfirming) return;
    const timer = setTimeout(() => setIsConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [isConfirming]);

  if (isLoading && queries.length === 0) return null;

  return (
    <Panel
      title="Past questions"
      action={
        queries.length > 0 ? (
          <button
            type="button"
            className={isConfirming ? "link-btn link-danger" : "link-btn"}
            onClick={() => {
              if (!isConfirming) {
                setIsConfirming(true);
                return;
              }
              setIsConfirming(false);
              void onClear();
            }}
          >
            {isConfirming ? "Really clear?" : "Clear"}
          </button>
        ) : undefined
      }
    >
      {error ? <ErrorNote message={error} /> : null}

      {queries.length === 0 && !error ? (
        <EmptyState title="No questions yet" hint="Answers you get are kept here so you can come back to them." />
      ) : (
        <ul className="history">
          {queries.map((query) => (
            <li key={query.id}>
              <button
                type="button"
                className={query.id === selectedId ? "history-item history-active" : "history-item"}
                onClick={() => onSelect(query)}
              >
                <span className="history-question">{query.question}</span>
                <span className="history-meta">
                  {formatWhen(query.createdAt)} · {query.sources.length}{" "}
                  {query.sources.length === 1 ? "source" : "sources"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const isToday = new Date().toDateString() === date.toDateString();

  return isToday
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
