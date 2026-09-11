import { useState, type FormEvent } from "react";
import { useAsk } from "../hooks/useAsk.js";
import { AnswerText } from "./AnswerText.js";

export function AskPanel() {
  const [question, setQuestion] = useState("");
  const { result, isAsking, error, ask } = useAsk();

  const isEmpty = question.trim().length < 3;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isEmpty || isAsking) return;
    await ask(question.trim());
  }

  return (
    <section className="panel">
      <h2>Ask a question</h2>

      <form className="ask-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="What did I save about vector stores?"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button type="submit" className="primary" disabled={isEmpty || isAsking}>
          {isAsking ? "Thinking…" : "Ask"}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {result ? (
        <div className="result">
          <AnswerText text={result.answer} sourceCount={result.sources.length} />

          {result.sources.length > 0 ? (
            <>
              <h3 className="sources-title">Sources</h3>
              <ol className="sources">
                {result.sources.map((source) => (
                  <li key={source.chunkId} id={`source-${source.citation}`}>
                    <div className="source-head">
                      <span className="cite cite-static">{source.citation}</span>
                      <strong>{source.title}</strong>
                      <span className="score" title="similarity score">
                        {source.score.toFixed(2)}
                      </span>
                    </div>
                    <p className="snippet">{source.snippet}</p>
                    {source.sourceUrl ? (
                      <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                        {source.sourceUrl}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ol>
            </>
          ) : null}

          <p className="stats">
            searched {result.stats.candidateChunks} chunks in {result.stats.retrievalMs}ms
            {result.stats.model !== "none"
              ? ` · ${result.stats.model} · ${result.stats.inputTokens} in / ${result.stats.outputTokens} out`
              : null}
          </p>
        </div>
      ) : null}
    </section>
  );
}
