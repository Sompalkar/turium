import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client.js";
import type { SourceType } from "../api/types.js";

interface Props {
  onAdded: () => Promise<void>;
}

export function AddItemForm({ onAdded }: Props) {
  const [sourceType, setSourceType] = useState<SourceType>("note");
  const [value, setValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmpty = value.trim().length === 0;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isEmpty || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      await api.ingest(
        sourceType === "note"
          ? { sourceType: "note", text: value.trim() }
          : { sourceType: "url", url: value.trim() },
      );
      setValue("");
      await onAdded();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save that");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2>Save something</h2>

      <div className="tabs">
        {(["note", "url"] as const).map((type) => (
          <button
            key={type}
            type="button"
            className={sourceType === type ? "tab tab-active" : "tab"}
            onClick={() => {
              setSourceType(type);
              setError(null);
            }}
          >
            {type === "note" ? "Note" : "URL"}
          </button>
        ))}
      </div>

      {sourceType === "note" ? (
        <textarea
          rows={5}
          placeholder="Paste or type a note"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      ) : (
        <input
          type="url"
          placeholder="https://example.com/article"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      )}

      {error ? <p className="error">{error}</p> : null}

      <button type="submit" className="primary" disabled={isEmpty || isSaving}>
        {isSaving ? (sourceType === "url" ? "Fetching page…" : "Saving…") : "Save"}
      </button>
    </form>
  );
}
