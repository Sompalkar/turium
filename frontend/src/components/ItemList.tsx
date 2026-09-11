import type { ItemSummary } from "../api/types.js";

interface Props {
  items: ItemSummary[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

export function ItemList({ items, total, isLoading, error }: Props) {
  return (
    <section className="panel">
      <h2>
        Saved items <span className="count">{total}</span>
      </h2>

      {error ? <p className="error">{error}</p> : null}
      {isLoading && items.length === 0 ? <p className="muted">Loading…</p> : null}
      {!isLoading && items.length === 0 && !error ? (
        <p className="muted">Nothing saved yet. Add a note or a URL to get started.</p>
      ) : null}

      <ul className="items">
        {items.map((item) => (
          <li key={item.id}>
            <div className="item-head">
              <span className={`badge badge-${item.sourceType}`}>{item.sourceType}</span>
              <h3>{item.title}</h3>
            </div>
            <p className="preview">{item.preview}</p>
            <div className="item-meta">
              <span>{formatDate(item.createdAt)}</span>
              <span>{item.contentLength.toLocaleString()} chars</span>
              {item.sourceUrl ? (
                <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                  source
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
