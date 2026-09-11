import type { ItemSummary } from "../api/types.js";
import { ItemRow } from "./ItemRow.js";
import { EmptyState } from "./ui/EmptyState.js";
import { ErrorNote } from "./ui/ErrorNote.js";
import { Panel } from "./ui/Panel.js";

interface Props {
  items: ItemSummary[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

export function ItemList({ items, total, isLoading, error }: Props) {
  const isFirstLoad = isLoading && items.length === 0;

  return (
    <Panel title="Inbox" action={total > 0 ? <span className="counter">{total}</span> : undefined}>
      {error ? <ErrorNote message={error} /> : null}

      {isFirstLoad ? (
        <ul className="items" aria-hidden="true">
          {[0, 1, 2].map((key) => (
            <li key={key} className="item skeleton">
              <span className="sk sk-title" />
              <span className="sk sk-line" />
              <span className="sk sk-line sk-short" />
            </li>
          ))}
        </ul>
      ) : null}

      {!isLoading && items.length === 0 && !error ? (
        <EmptyState title="Nothing saved yet" hint="Add a note or a link and it becomes searchable straight away." />
      ) : null}

      {items.length > 0 ? (
        <ul className="items">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
