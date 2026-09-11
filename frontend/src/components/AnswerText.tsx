import { Fragment, type FocusEvent, type MouseEvent } from "react";
import type { AnswerSource } from "../api/types.js";

interface Props {
  text: string;
  sources: AnswerSource[];
}

const CITATION = /(\[\d+\])/g;
const TIP_LENGTH = 180;

// Turns the [1] markers the model wrote into chips that preview their source
// on hover and jump to it on click.
export function AnswerText({ text, sources }: Props) {
  const byCitation = new Map(sources.map((source) => [source.citation, source]));

  return (
    <p className="answer">
      {text.split(CITATION).map((part, index) => {
        const match = /^\[(\d+)\]$/.exec(part);
        const source = match ? byCitation.get(Number(match[1])) : undefined;

        if (!source) return <Fragment key={index}>{part}</Fragment>;

        return (
          <span className="cite-wrap" key={index} onMouseEnter={keepTipOnScreen} onFocus={keepTipOnScreen}>
            <a href={`#source-${source.citation}`} className="cite">
              {source.citation}
            </a>
            <span className="cite-tip" role="tooltip">
              <span className="cite-tip-head">
                <span className="cite-tip-title">{source.title}</span>
                <span className="cite-tip-score">{source.score.toFixed(2)}</span>
              </span>
              <span className="cite-tip-text">{preview(source.snippet)}</span>
              {source.sourceUrl ? <span className="cite-tip-host">{hostOf(source.sourceUrl)}</span> : null}
            </span>
          </span>
        );
      })}
    </p>
  );
}

const EDGE_MARGIN = 12;

// The tooltip is centred on its chip, which would push it off screen for a chip
// near the edge, so centre it in pixels and clamp it to the viewport.
function keepTipOnScreen(event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) {
  const wrap = event.currentTarget;
  const tip = wrap.querySelector<HTMLElement>(".cite-tip");
  if (!tip) return;

  const anchor = wrap.getBoundingClientRect();
  const width = tip.offsetWidth;
  let left = (anchor.width - width) / 2;

  const overflowLeft = EDGE_MARGIN - (anchor.left + left);
  if (overflowLeft > 0) left += overflowLeft;

  const overflowRight = anchor.left + left + width - (window.innerWidth - EDGE_MARGIN);
  if (overflowRight > 0) left -= overflowRight;

  tip.style.left = `${Math.round(left)}px`;
  tip.style.setProperty("--arrow-left", `${Math.round(anchor.width / 2 - left)}px`);
}

function preview(snippet: string): string {
  return snippet.length > TIP_LENGTH ? `${snippet.slice(0, TIP_LENGTH).trimEnd()}...` : snippet;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
