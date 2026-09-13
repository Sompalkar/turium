import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client.js";
import type { ItemSummary } from "../api/types.js";
import { Badge } from "./ui/Badge.js";

interface Props {
  item: ItemSummary;
  onDeleted: () => Promise<void>;
}

export function ItemRow({ item, onDeleted }: Props) {
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Asking twice is enough of a guard, and it undoes itself.
  useEffect(() => {
    if (!isConfirming) return;
    const timer = setTimeout(() => setIsConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [isConfirming]);

  async function remove() {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    setIsConfirming(false);
    setIsDeleting(true);
    try {
      await api.deleteItem(item.id);
      await onDeleted();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not delete this item");
      setIsDeleting(false);
    }
  }

  const isTruncated = item.contentLength > item.preview.length;

  async function toggle() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setIsOpen(true);

    // Fetch the body once, the first time it is actually asked for.
    if (fullContent === null) {
      try {
        const response = await api.getItem(item.id);
        setFullContent(response.item.content);
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : "Could not load this item");
      }
    }
  }

  return (
    <li className="item">
      <div className="item-top">
        <Badge sourceType={item.sourceType} />
        <h3>{item.title}</h3>
      </div>

      <p className="item-body">{isOpen && fullContent ? fullContent : item.preview}</p>
      {error ? <p className="error-inline">{error}</p> : null}

      <div className="item-foot">
        <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
        <span className="dot" aria-hidden="true" />
        <span>{item.contentLength.toLocaleString()} chars</span>

        {isTruncated ? (
          <button type="button" className="link-btn" onClick={toggle}>
            {isOpen ? "Show less" : "Show all"}
          </button>
        ) : null}

        {item.sourceUrl ? (
          <a href={item.sourceUrl} target="_blank" rel="noreferrer">
            Open source
          </a>
        ) : null}

        <button
          type="button"
          className={isConfirming ? "link-btn link-danger item-delete" : "link-btn item-delete"}
          onClick={remove}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting" : isConfirming ? "Really delete?" : "Delete"}
        </button>
      </div>
    </li>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const isToday = new Date().toDateString() === date.toDateString();

  return isToday
    ? `Today ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
