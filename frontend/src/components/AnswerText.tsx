import { Fragment } from "react";

interface Props {
  text: string;
  sourceCount: number;
}

const CITATION = /(\[\d+\])/g;

// Turns the [1] markers the model wrote into chips that point at the source cards.
export function AnswerText({ text, sourceCount }: Props) {
  const parts = text.split(CITATION);

  return (
    <p className="answer">
      {parts.map((part, index) => {
        const match = /^\[(\d+)\]$/.exec(part);
        const citation = match ? Number(match[1]) : null;

        if (citation === null || citation < 1 || citation > sourceCount) {
          return <Fragment key={index}>{part}</Fragment>;
        }

        return (
          <a key={index} href={`#source-${citation}`} className="cite">
            {citation}
          </a>
        );
      })}
    </p>
  );
}
