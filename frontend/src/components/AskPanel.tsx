import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useAsk } from "../hooks/useAsk.js";
import type { ItemSummary } from "../api/types.js";
import { AnswerText } from "./AnswerText.js";
import { SourceCard } from "./SourceCard.js";
import { Button } from "./ui/Button.js";
import { EmptyState } from "./ui/EmptyState.js";
import { ErrorNote } from "./ui/ErrorNote.js";
import { Panel } from "./ui/Panel.js";

interface Props {
  items: ItemSummary[];
}

export function AskPanel({ items }: Props) {
  const [question, setQuestion] = useState("");
  const { result, isAsking, error, ask } = useAsk();

  const isTooShort = question.trim().length < 3;
  const suggestions = items.slice(0, 2).map((item) => `What did I save about ${firstWords(item.title)}?`);

  async function submit(value: string) {
    if (value.trim().length < 3 || isAsking) return;
    setQuestion(value);
    await ask(value.trim());
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(question);
  }

  // Enter asks, shift+enter adds a line. Questions are usually one line.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit(question);
    }
  }

  return (
    <Panel title="Ask">
      <form onSubmit={handleSubmit} className="stack">
        <textarea
          className="ask-input"
          rows={2}
          placeholder="Ask anything about what you have saved"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="form-foot">
          <Button type="submit" disabled={isTooShort} loading={isAsking}>
            {isAsking ? "Searching" : "Ask"}
          </Button>
          <span className="hint">Enter to ask, shift and enter for a new line.</span>
        </div>
      </form>

      {error ? <ErrorNote message={error} /> : null}

      {!result && !error && !isAsking ? (
        items.length === 0 ? (
          <EmptyState title="Answers come from your own notes" hint="Save something first, then ask about it." />
        ) : (
          <div className="suggestions">
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" className="chip" onClick={() => void submit(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        )
      ) : null}

      {result ? (
        <div className="result">
          <AnswerText text={result.answer} sourceCount={result.sources.length} />

          {result.sources.length > 0 ? (
            <>
              <h3 className="subhead">
                Sources <span className="counter">{result.sources.length}</span>
              </h3>
              <ol className="sources">
                {result.sources.map((source) => (
                  <SourceCard key={source.chunkId} source={source} />
                ))}
              </ol>
            </>
          ) : null}

          <p className="stats">
            {result.stats.candidateChunks} chunks searched in {result.stats.retrievalMs}ms
            {result.stats.model !== "none"
              ? ` · ${result.stats.model} · ${result.stats.inputTokens} in, ${result.stats.outputTokens} out`
              : ""}
          </p>
        </div>
      ) : null}
    </Panel>
  );
}

function firstWords(title: string): string {
  const words = title.split(/\s+/).slice(0, 5).join(" ");
  return words.replace(/[.,;:]$/, "").toLowerCase();
}
