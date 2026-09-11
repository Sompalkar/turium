import { AddItemForm } from "./components/AddItemForm.js";
import { AskPanel } from "./components/AskPanel.js";
import { ItemList } from "./components/ItemList.js";
import { useItems } from "./hooks/useItems.js";

export function App() {
  const { items, total, isLoading, error, reload } = useItems();

  return (
    <div className="page">
      <header>
        <h1>Knowledge Inbox</h1>
        <p className="muted">Save notes and pages, then ask questions about them.</p>
      </header>

      <main className="columns">
        <div className="column">
          <AddItemForm onAdded={reload} />
          <AskPanel />
        </div>
        <div className="column">
          <ItemList items={items} total={total} isLoading={isLoading} error={error} />
        </div>
      </main>
    </div>
  );
}
