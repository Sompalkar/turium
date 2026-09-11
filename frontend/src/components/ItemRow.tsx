import { useState } from "react";
import { api, ApiError } from "../api/client.js";
import type { ItemSummary } from "../api/types.js";
import { Badge } from "./ui/Badge.js";

export function ItemRow({ item }: { item: ItemSummary }) {
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <a className="item-link" href={item.sourceUrl} target="_blank" rel="noreferrer">
            Open source
          </a>
        ) : null}
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
