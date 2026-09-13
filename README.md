# Knowledge Inbox

Save notes and links, then ask questions about them. Answers are written from your own saved
content and cite the passages they came from.

## Running it

You need **Node 24 or newer** (the server uses the built in `node:sqlite` module) and an
**Anthropic API key**.

```bash
git clone https://github.com/Sompalkar/turium.git
cd turium
npm run setup
```

Add your key:

```bash
cp server/.env.example server/.env
```

Open `server/.env` and paste your key after `ANTHROPIC_API_KEY=`. Then start both halves with one
command:

```bash
npm run dev
```

Open **http://localhost:5173**. The API runs on port 4000 and Vite proxies `/api` to it, so the
browser stays on one origin and there is no CORS setup to get wrong.

The very first start downloads the embedding model, about 90 MB, which takes a minute or so on a
cold cache. It is cached afterwards and the server logs `embedding model ready` when it can
answer questions. After that the only outbound calls are fetching URLs you save and generating
answers.

Saving notes, saving links and browsing them all work without an API key. Only asking questions
needs one, and without it the answer comes back as a plain `ANTHROPIC_API_KEY is not set` error
rather than something cryptic.

If you would rather run the two halves separately, `npm --prefix server run dev` and
`npm --prefix frontend run dev` in two terminals do the same thing.

Tests: `npm test`.

## How it works

Saving something splits it into chunks, turns each chunk into a vector, and writes all of it to
SQLite. Asking a question turns the question into a vector too, scores it against every stored
chunk, and sends the best few to Claude with instructions to answer only from what it was given.

The model never sees your library, only the handful of passages retrieved for the question in
front of it. That is what keeps answers grounded, and it is also why a question costs a few
hundred tokens instead of however large your inbox has grown.

Answers are kept, along with the sources behind them. Filing one is deliberately not allowed to
fail the request: the answer has already been paid for, so a write that throws is logged and the
answer still goes back.

## Layout

```
server/src
├── routes/         request shape only
├── services/       ingest, chunking, embedding, retrieval, answering
├── repositories/   the only files that write SQL
├── domain/         shared types
├── db/             connection and migrations
├── schemas/        zod validation
├── middleware/     request context and error handling
└── lib/            pure helpers: chunker, vector maths, html to text, prompt

frontend/src
├── api/            one client, typed errors
├── hooks/          useItems, useAsk, useHistory
└── components/     feature components, plus ui/ for the shared pieces
```

A route parses input, calls a service and formats the reply. A service decides what happens. A
repository is the only thing that touches SQL. Keeping those separate is the reason no file here
runs long.

## The API

Everything lives under `/api`.

`POST /ingest` saves a note or a link and returns 201 with the stored item.

```jsonc
{ "sourceType": "note", "text": "...", "title": "optional" }
{ "sourceType": "url", "url": "https://example.com", "title": "optional" }
```

`GET /items` lists them newest first, with `limit` (default 20, max 100) and `offset`. There is
also `GET /items/:id` for the full body and `GET /items/:id/chunks` for the chunks it was split
into, which is handy for seeing what retrieval actually has to work with.

`POST /query` takes `{ "question": "...", "topK": 5 }` and answers it:

```jsonc
{
  "id": "uuid",
  "createdAt": "2026-09-11T13:06:52.031Z",
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
      "snippet": "the passage the answer used",
      "score": 0.5312
    }
  ],
  "stats": { "candidateChunks": 22, "retrievalMs": 6, "model": "claude-opus-5",
             "inputTokens": 376, "outputTokens": 135 }
}
```

The `citation` numbers line up with the `[1]` markers in the answer, so the interface can link
each one back to the passage it came from. The model cites only the sources it actually used, so
a five source answer often carries two or three citations; the interface separates the ones it
leaned on from the near misses rather than implying all of them were used.

Every answer is also written to a `queries` table. `GET /queries` returns them newest first
(`limit` default 20, max 50) in the same shape, which is what makes an answer survive a refresh,
and `DELETE /queries` clears them and reports how many went.

Errors always come back the same shape, carrying a request id that matches the log lines for
that request:

```jsonc
{
  "error": { "code": "blocked_host", "message": "Refusing to fetch a private or local address: localhost" },
  "requestId": "5b45137c-8b81-4439-8685-ec18ce9068be"
}
```

| Status | Meaning |
| --- | --- |
| 400 | Your input: malformed body, empty note, bad URL, blocked host, oversized page |
| 404 | No item with that id |
| 429 | Anthropic rate limited us |
| 500 | Our fault: missing or rejected API key, or a bug |
| 502 | An upstream failed: the page would not load, or the model call did not return |

The 400 against 502 split is there because a URL you mistyped is worth fixing and a site that is
down is not. Folding both into a 500 makes the API impossible to debug from outside.

## Decisions

**Chunking.** Split on the largest natural boundary that fits, then pack the pieces back up to
900 characters with 150 characters of overlap. Paragraph breaks first, then single newlines, then
sentence ends, and a blunt character cut only when there is nothing else left.

900 characters is roughly 200 tokens, small enough that a chunk is usually about one thing. That
matters because an embedding is a single point: a chunk spanning five topics lands in the average
of all five and matches everything weakly. The overlap is for the sentence that falls across a
boundary, which would otherwise belong to neither chunk and be unreachable. It costs about 15%
duplicated text, which is nothing at this size.

Splitting on boundaries matters more than the exact numbers. A chunk cut mid sentence embeds as
close to noise, and `text.slice(i, i + 900)` is the tempting shortcut that quietly ruins
retrieval. Chunks also record the character offsets they came from, so a citation can point at
the passage rather than just naming the document.

**Embeddings.** `all-MiniLM-L6-v2` through transformers.js, running in the server process, 384
dimensions. A hosted model would retrieve better, but this one needs no key, costs nothing, works
offline and keeps a network round trip out of every save. The difference does not show at this
size. Vectors come out unit length, so cosine similarity is just a dot product. Changing provider
means rewriting `services/embedder.ts` and nothing else, since the rest of the code only knows
about `embedTexts(strings) => vectors`.

**Storage.** Vectors sit in the same SQLite database as the content, as raw float32 blobs of 1536
bytes. JSON would be about three times the size and would need parsing on every read. Search is a
straight scan: score everything, sort, keep the best five. It is exact, there is no index to keep
in sync and no extra service to run. A minimum score of 0.15 drops obvious noise, and no more
than three chunks may come from a single item so one long article cannot crowd out everything
else.

**Grounding.** Retrieval on its own cannot tell a good match from a bad one. Ask a library about
software deployment what the migratory patterns of arctic terns are and it will hand back a
deploy checklist at 0.207, because the word *migrations* appears in both. A fair question about
releasing to production scored 0.185 against that same note, which is lower. No threshold
separates those two, so tuning one is not the fix.

The fix is letting the model refuse. The system prompt allows only facts from the supplied
sources and tells it to say when they do not answer the question. Asked about terns it says the
sources do not cover them, and points out that migrations there means database schema changes.
Retrieval narrows the field; judging whether the survivors are relevant is the model's job. When
retrieval finds nothing at all, no request is sent, because there is nothing to ground an answer
in and no reason to pay for the call.

## Where it falls over

Every query reads every vector out of SQLite and scores it. Timing the scan on this machine with
random 384 dimension vectors:

| Chunks | Scan and sort | Vectors held |
| --- | --- | --- |
| 1,000 | 1ms | 2 MB |
| 100,000 | 52ms | 154 MB |
| 1,000,000 | 601ms | 1.5 GB |

The arithmetic turned out not to be the problem, which I did not expect. A million dot products
is 600ms. The problem is the 154 MB being read and turned back into Float32Arrays on every single
question, because nothing is cached between requests. That I/O dominates long before the maths
does, so the first fix is not an index but holding the vectors in memory and reloading them when
something is saved. That is a small change and buys an order of magnitude.

Past a million chunks memory becomes the wall and an approximate nearest neighbour index is the
real answer, either `sqlite-vec` to stay inside one file or Postgres with `pgvector`. Both give
up a little recall for a lot of speed.

Nothing to do with vectors: ingest is synchronous. Saving a link fetches the page, chunks it and
embeds every chunk before replying, so a long article holds the connection for several seconds
and a slow site holds it for the full ten second timeout.

## If this were going to production

Ingest would become a job. `POST /ingest` would store the item as pending and return straight
away, a worker would do the fetching and embedding, and the interface would poll. That fixes the
long request and brings retries with it.

The embedding model name is stored per chunk and retrieval filters on it, which means swapping
models today silently hides everything saved before the swap. That needs a backfill that
re-embeds and cuts over.

Then the ordinary things: auth, so a query is not scanning every user's chunks; a unique
constraint on URLs, since saving the same page twice currently stores it twice and both copies
compete for retrieval slots; rate limiting on `/query`, because each call costs money; and
shipping the logs somewhere, which is easy since they are already one JSON object per line.

One security note. The URL fetcher refuses private and local addresses by hostname, which stops
the obvious attempts to make the server probe its own network. It does not stop a public domain
whose DNS points at an internal address. The full fix resolves the name first and checks the
address it is about to connect to.

## Deploying

`render.yaml` describes both services. The API is the fiddly one because it keeps state on disk.

**API.** Root directory `server`, build `npm install --include=dev && npm run build`, start
`npm start`, health check `/api/health`. It needs Node 24 or newer for `node:sqlite`, which
`server/.node-version` pins. Set these:

| Variable | Value |
| --- | --- |
| `ANTHROPIC_API_KEY` | your key |
| `ALLOWED_ORIGINS` | the frontend origin, no trailing slash |
| `DATABASE_FILE` | a path on the mounted disk, e.g. `/var/data/knowledge-inbox.db` |
| `EMBEDDING_CACHE_DIR` | also on the disk, e.g. `/var/data/models` |

Both disk paths matter. Without them the SQLite file and the 90 MB model are thrown away on every
deploy, so the library empties itself and the first request after each restart pays to download
the model again. With the cache on a disk the model loads in about 60ms instead. Render's free
plan does not offer disks, so a free instance resets on every deploy.

**Frontend.** Root directory `frontend`, build `npm install --include=dev && npm run build`,
publish `dist`, with a rewrite from `/*` to `/index.html`. Set `VITE_API_BASE_URL` to the API
origin. Vite inlines it at build time, so changing it needs a rebuild, not just a restart.

The two are on different origins in production, which is why the API has a CORS allowlist.
Locally none of this applies: Vite proxies `/api`, everything is same origin, and both variables
can stay empty.

## Debugging

Every request gets an id, returned in the `x-request-id` header and in any error body, and
stamped on every log line for that request. A user reporting a problem gives you one string that
finds everything the server did:

```bash
grep 5b45137c server.log
```

Logs are JSON lines. Ingest records content length and chunk count, retrieval records how many
chunks it scanned and the best score, generation records the model, token counts and stop reason.
Between them you can usually explain a bad answer without a debugger. A low top score means
retrieval missed; a good score with a hedging answer means the passage came back but did not hold
the fact.

## Tests

Sixteen tests, `npm test` in `server`. They cover the parts that fail quietly rather than loudly:
the chunker (limits respected, boundaries preferred, consecutive chunks genuinely overlap, offsets
map back to the source, a wall of text with no boundaries still splits), the vector helpers (blob
round trip, identical vectors score 1, orthogonal score 0, mismatched lengths throw) and page
extraction (scripts and navigation dropped, blocks kept apart, main region preferred).

There are no route tests. That is the first gap I would close, with `supertest` against
`createApp()`, which is already separate from the listening server for exactly that reason.
