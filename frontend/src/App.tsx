import { useEffect, useState } from "react";
import type { QueryResponse } from "./api/types.js";
import { AddItemForm } from "./components/AddItemForm.js";
import { AskPanel } from "./components/AskPanel.js";
import { HistoryPanel } from "./components/HistoryPanel.js";
import { ItemList } from "./components/ItemList.js";
import { useHistory } from "./hooks/useHistory.js";
import { useItems } from "./hooks/useItems.js";

export function App() {
  const { items, total, isLoading, error, reload } = useItems();
  const history = useHistory();
  const [result, setResult] = useState<QueryResponse | null>(null);

  // After a refresh, put the most recent answer back on screen.
  useEffect(() => {
    setResult((current) => current ?? history.queries[0] ?? null);
  }, [history.queries]);

  async function handleAnswered(answer: QueryResponse) {
    setResult(answer);
    await history.reload();
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name">Knowledge Inbox</span>
          </div>
          <p className="brand-tag">Save what matters, ask it later</p>
        </div>
      </header>

      <main className="layout">
        <div className="col col-main">
          <AskPanel items={items} result={result} onAnswered={handleAnswered} />
          <HistoryPanel
            queries={history.queries}
            isLoading={history.isLoading}
            error={history.error}
            selectedId={result?.id ?? null}
            onSelect={setResult}
            onClear={async () => {
              await history.clear();
              setResult(null);
            }}
          />
        </div>
        <div className="col col-side">
          <AddItemForm onAdded={reload} />
          <ItemList items={items} total={total} isLoading={isLoading} error={error} onDeleted={reload} />
        </div>
      </main>
    </div>
  );
}
