# Knowledge Inbox

Save notes and web pages, then ask questions about them. Answers come from your own saved
content and cite the passages they came from.

## Requirements

- Node 22 or newer (uses the built in `node:sqlite` module)
- An Anthropic API key

## Running it

Two terminals. The server first:

```bash
cd server
npm install
cp .env.example .env   # then paste your ANTHROPIC_API_KEY into it
npm run dev
```

Then the web app:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to the server on port 4000, so the
browser stays on one origin and there is no CORS setup.

The first start downloads the embedding model, about 90 MB. It is cached after that and the
server logs `embedding model ready` when it has finished. Nothing else needs a network
connection except fetching URLs you save and generating answers.

Tests:

```bash
cd server && npm test
```

## How it works

```
save     text or URL ─▶ fetch page ─▶ chunk ─▶ embed ─▶ SQLite
ask      question ─▶ embed ─▶ score every chunk ─▶ top 5 ─▶ Claude ─▶ answer + citations
```

The model never sees your library. It only ever sees the handful of chunks retrieved for the
question being asked, which is what keeps answers grounded and cheap.

## Project layout

```
server/src
├── routes/         HTTP shape only, no logic
├── services/       ingest, chunking, embedding, retrieval, answering
├── repositories/   the only files that write SQL
├── domain/         shared types
├── db/             connection and migrations
├── schemas/        zod request validation
├── middleware/     request context and error handling
└── lib/            pure helpers: chunker, vector maths, html to text, prompt

frontend/src
├── api/            one client, typed errors
├── hooks/          useItems, useAsk
└── components/     AddItemForm, ItemList, AskPanel, AnswerText
```

A route parses the request, calls a service and formats the response. A service decides what
happens. A repository is the only thing that touches SQL. Keeping those apart is why no file
here is long.

## API

All endpoints are under `/api`. Request and response bodies are JSON.

### POST /ingest

Saves a note or a URL. Returns `201` with the stored item.

```jsonc
// a note
{ "sourceType": "note", "text": "...", "title": "optional" }

// a URL, fetched and stripped to readable text server side
{ "sourceType": "url", "url": "https://example.com", "title": "optional" }
```

```jsonc
{
  "item": {
    "id": "uuid",
    "sourceType": "url",
    "title": "Example Domain",
    "sourceUrl": "https://example.com",
    "preview": "first 240 characters…",
    "contentLength": 127,
    "createdAt": "2026-09-11T10:58:59.893Z"
  }
}
```

### GET /items

Newest first. `limit` defaults to 20, max 100. `offset` defaults to 0.

```jsonc
{
  "items": [ /* same shape as above */ ],
  "pagination": { "limit": 20, "offset": 0, "total": 4 }
}
```

`GET /items/:id` returns one item with its full content. `GET /items/:id/chunks` returns the
chunks it was split into, which is useful for seeing what retrieval actually has to work with.

### POST /query

```jsonc
{ "question": "how big should chunks be?", "topK": 5 }
```

```jsonc
{
  "question": "how big should chunks be?",
  "answer": "Around two hundred tokens with a small overlap [1].",
  "sources": [
    {
      "citation": 1,
      "chunkId": "uuid",
      "itemId": "uuid",
      "title": "Chunk sizing",
      "sourceType": "note",
      "sourceUrl": null,
      "snippet": "the exact passage the answer used",
      "score": 0.5312
    }
  ],
  "stats": {
    "candidateChunks": 4,
    "retrievalMs": 6,
    "model": "claude-opus-5",
    "inputTokens": 376,
    "outputTokens": 135
  }
}
```

The `citation` numbers match the `[1]` markers in the answer text, so the UI can link each one
to the passage it came from.

### Errors

Every error has the same shape, and every response carries a request id that matches the log
lines for that request.

```jsonc
{
  "error": {
    "code": "blocked_host",
    "message": "Refusing to fetch a private or local address: localhost",
    "details": { }
  },
  "requestId": "5b45137c-8b81-4439-8685-ec18ce9068be"
}
```

| Status | When |
| --- | --- |
| 400 | Your input was wrong: bad body, empty note, bad URL, blocked host, page too large |
| 404 | No item with that id |
| 429 | The Anthropic API rate limited us |
| 500 | Our fault: missing or rejected API key, or an unexpected bug |
| 502 | An upstream was at fault: the page would not load, or the model call failed |

The split between 400 and 502 is deliberate. A URL you typed wrong is your problem and is worth
fixing; a site that is down is not, and collapsing both into 500 makes the API impossible to
debug from the outside.

## Design decisions

### Chunking

Try the biggest natural boundary that fits, then pack the pieces back up to the limit.
Paragraph breaks first, then single newlines, then sentence ends, and a hard character cut only
when there is no boundary left. Chunks are capped at **900 characters** with **150 characters of
overlap**.

900 characters is roughly 200 tokens. That is small enough that one chunk is about one idea,
which matters because an embedding is a single point in space: a chunk covering five topics sits
in the average of all five and matches every query weakly and none of them strongly. It is also
well inside the model's window, so nothing is silently truncated.

The overlap exists for the sentence that straddles a boundary. Without it a fact split across the
seam belongs to neither chunk's embedding and cannot be retrieved at all. The cost is about 15%
duplicated text, which is nothing at this size.

Splitting on boundaries rather than fixed windows matters more than the exact numbers. A chunk
cut mid sentence embeds as something close to noise. `text.slice(i, i + 900)` is the tempting
shortcut and it measurably hurts retrieval.

Chunks store the character offsets they came from, so a citation can point at the exact passage
rather than just naming the document.

### Embeddings

`all-MiniLM-L6-v2` running locally through transformers.js. 384 dimensions.

Local, because it needs no key, costs nothing, works offline and removes a network round trip
from every ingest. It is small and old, and a hosted model would retrieve better, but the
difference does not show at this scale and the operational simplicity does.

Vectors are unit length, so cosine similarity is just a dot product and there is no
normalisation at query time.

Swapping providers means rewriting `services/embedder.ts` and nothing else. The rest of the code
only knows `embedTexts(strings) => vectors`.

### Vector storage

Vectors are stored as raw float32 blobs in the same SQLite database as the content, 1536 bytes
each. Not JSON, which would be about three times larger and need parsing on every read.

Search is a brute force scan: score every chunk, sort, take the top 5. That is exact, has no
index to build or keep in sync, and no extra service to run. At four chunks it takes 2ms.

Two guards sit on top of the scan. A minimum score of 0.15 drops obvious noise, and at most 3
chunks may come from any one item so that a long article cannot fill every slot and crowd out
the rest of your library.

### Grounding

The retrieval step cannot tell a good match from a bad one on its own. Asking a library about
software deployment "what are the migratory patterns of arctic terns" returns a deploy checklist
at 0.207, because *migrations* is in both. A legitimate question about releasing to production
scored 0.185 against the same note, which is lower. No threshold separates those two cases, so
tuning one is not the answer.

The answer is that generation gets to refuse. The system prompt allows only facts from the
supplied sources and requires the model to say so when they do not answer the question. Asked
about terns it replies that the sources do not cover them and notes that "migrations" there means
database schema changes. Retrieval narrows the field; deciding whether the survivors are actually
relevant is the model's job.

When retrieval returns nothing at all, no request is sent to the model. There is nothing to
ground an answer in and no reason to pay for the call.

## What breaks at scale

Retrieval is linear in the number of chunks and every vector is loaded into memory to score it.

| Chunks | Scan | Vectors in memory |
| --- | --- | --- |
| 1,000 | a few ms | 1.5 MB |
| 100,000 | around half a second | 150 MB |
| 10,000,000 | about a minute | 15 GB |

So the honest ceiling is roughly 100k chunks, a few thousand documents. Past that the fix is an
approximate nearest neighbour index: `sqlite-vec` to stay in SQLite, or Postgres with `pgvector`
and an HNSW index. Both trade a little recall for orders of magnitude of speed.

The other limit is that ingest is synchronous. Saving a URL fetches the page, chunks it and
embeds every chunk before the request returns, so a long article can hold the connection for
several seconds and a slow site holds it for the full 10 second timeout.

## What would change in production

- **Ingest becomes a job.** `POST /ingest` would store the item as `pending` and return
  immediately, with a worker doing the fetch and embed and the UI polling for status. That fixes
  the long request and gives retries for free.
- **An index once the library is large enough.** Not before. An HNSW index is only worth its
  complexity past the scan ceiling above.
- **Re-embedding.** The embedding model name is stored per chunk and retrieval filters on it, so
  changing models today silently hides all the old content. Production needs a backfill job that
  re-embeds everything and swaps over.
- **Auth and per-user scoping.** Every query currently scans every chunk in the database, which
  is fine for one user and wrong for two.
- **Deduplication.** Saving the same URL twice stores it twice and both copies compete for
  retrieval slots. A unique constraint on the URL with an explicit re-fetch would fix it.
- **Rate limiting on `/query`**, since each call costs money.
- **DNS pinning on the URL fetcher.** The current guard blocks private addresses by hostname,
  which does not stop a public domain that resolves to an internal IP. The complete fix resolves
  the name first and checks the address it will actually connect to.
- **Logs shipped somewhere.** They are already one JSON object per line with a request id, so
  they only need a destination.

## Debugging

Every request gets an id, returned in the `x-request-id` header and in every error body, and
stamped on every log line for that request. So a user reporting a failure hands you one string
that finds everything the server did:

```bash
grep 5b45137c server.log
```

Logs are JSON lines. Ingest records the content length and chunk count, retrieval records how
many chunks were scanned and the top score, generation records the model, token counts and stop
reason. Those three together usually explain a bad answer without needing a debugger: a low top
score means retrieval missed, and a good score with a hedging answer means the chunk was
retrieved but did not contain the fact.

## Tests

11 tests, run with `npm test` in `server`. They cover the two pieces that fail silently rather
than loudly: the chunker (limits respected, boundaries preferred, consecutive chunks really do
overlap, offsets map back to the source, a wall of text with no boundaries still splits) and the
vector helpers (blob round trip, identical vectors score 1, orthogonal score 0, mismatched
lengths throw).

There are no tests for the routes. With more time that is the first gap I would close, using
`supertest` against `createApp()`, which is already separated from the listening server for
exactly that reason.
