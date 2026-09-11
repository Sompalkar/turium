import { useState } from "react";
import type { AnswerSource } from "../api/types.js";
import { Badge } from "./ui/Badge.js";

const CLAMP_LENGTH = 220;

export function SourceCard({ source }: { source: AnswerSource }) {
  const [isOpen, setIsOpen] = useState(false);
  const isLong = source.snippet.length > CLAMP_LENGTH;

  const shown = isOpen || !isLong ? source.snippet : `${source.snippet.slice(0, CLAMP_LENGTH).trimEnd()}...`;

  return (
    <li className="source" id={`source-${source.citation}`}>
      <div className="source-top">
        <span className="cite cite-static">{source.citation}</span>
        <h4>{source.title}</h4>
        <Badge sourceType={source.sourceType} />
        <span className="score" title="Similarity between your question and this passage">
          {source.score.toFixed(2)}
        </span>
      </div>

      <p className="source-snippet">{shown}</p>

      <div className="source-foot">
        {isLong ? (
          <button type="button" className="link-btn" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? "Show less" : "Show passage"}
          </button>
        ) : null}
        {source.sourceUrl ? (
          <a href={source.sourceUrl} target="_blank" rel="noreferrer">
            {hostOf(source.sourceUrl)}
          </a>
        ) : null}
      </div>
    </li>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
