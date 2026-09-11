import { AddItemForm } from "./components/AddItemForm.js";
import { AskPanel } from "./components/AskPanel.js";
import { ItemList } from "./components/ItemList.js";
import { useItems } from "./hooks/useItems.js";

export function App() {
  const { items, total, isLoading, error, reload } = useItems();

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
          <AskPanel items={items} />
        </div>
        <div className="col col-side">
          <AddItemForm onAdded={reload} />
          <ItemList items={items} total={total} isLoading={isLoading} error={error} />
        </div>
      </main>
    </div>
  );
}
