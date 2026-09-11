import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client.js";
import type { SourceType } from "../api/types.js";
import { Button } from "./ui/Button.js";
import { ErrorNote } from "./ui/ErrorNote.js";
import { Panel } from "./ui/Panel.js";
import { SegmentedControl } from "./ui/SegmentedControl.js";

interface Props {
  onAdded: () => Promise<void>;
}

const TABS = [
  { value: "note" as const, label: "Note" },
  { value: "url" as const, label: "Link" },
];

export function AddItemForm({ onAdded }: Props) {
  const [sourceType, setSourceType] = useState<SourceType>("note");
  const [value, setValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTitle, setSavedTitle] = useState<string | null>(null);

  const isEmpty = value.trim().length === 0;

  // Let the confirmation fade instead of sitting there for the rest of the session.
  useEffect(() => {
    if (!savedTitle) return;
    const timer = setTimeout(() => setSavedTitle(null), 4000);
    return () => clearTimeout(timer);
  }, [savedTitle]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isEmpty || isSaving) return;

    setIsSaving(true);
    setError(null);
    setSavedTitle(null);

    try {
      const saved = await api.ingest(
        sourceType === "note"
          ? { sourceType: "note", text: value.trim() }
          : { sourceType: "url", url: value.trim() },
      );
      setValue("");
      setSavedTitle(saved.item.title);
      await onAdded();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save that");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Panel title="Add to inbox">
      <form onSubmit={handleSubmit} className="stack">
        <SegmentedControl
          label="What are you saving"
          options={TABS}
          value={sourceType}
          onChange={(next) => {
            setSourceType(next);
            setError(null);
          }}
        />

        {sourceType === "note" ? (
          <textarea
            rows={5}
            placeholder="Anything worth keeping. A thought, a snippet, a decision and why you made it."
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

        {error ? <ErrorNote message={error} /> : null}
        {savedTitle ? <p className="flash">Saved {savedTitle}</p> : null}

        <div className="form-foot">
          <Button type="submit" disabled={isEmpty} loading={isSaving}>
            {isSaving && sourceType === "url" ? "Fetching page" : "Save"}
          </Button>
          {sourceType === "url" ? (
            <span className="hint">The page is fetched and stripped to text on the server.</span>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}
