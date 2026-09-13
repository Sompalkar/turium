# Knowledge Inbox

Save notes and links, then ask questions about them. Answers are written from your own saved
content and cite the passages they came from.

**Live demo: https://turium.vercel.app**

The demo API is on a free instance that sleeps when idle, so the first request after a quiet spell
takes half a minute or so while it wakes and loads the embedding model. That instance has no
persistent disk either, so it refills itself with a few sample notes whenever it restarts. Running
it locally, as below, has neither limitation.

## Run it

Needs **Node 24 or newer** (the server uses the built in `node:sqlite`) and an **Anthropic API key**.

```bash
git clone https://github.com/Sompalkar/turium.git
cd turium
npm run setup
cp server/.env.example server/.env    # paste your key into it
npm run dev
```

Open **http://localhost:5173**. The API is on port 4000 and Vite proxies `/api` to it, so there is
no CORS setup locally.

The first start downloads the embedding model, about 90 MB, then caches it. Saving and browsing
work without an API key; only asking needs one. `npm test` runs the tests.

## How it works

Saving splits the content into chunks, embeds each chunk, and writes everything to SQLite. Asking
embeds the question, scores it against every stored chunk, and sends the best few to Claude with
instructions to answer only from what it was given.

The model never sees your library, just the handful of passages retrieved for the question in
front of it. That is what keeps answers grounded, and why a question costs a few hundred tokens
however large the inbox grows.

## API

| Endpoint | Does |
| --- | --- |
| `POST /api/ingest` | Saves `{sourceType: "note", text}` or `{sourceType: "url", url}`. URLs are fetched and stripped to text server side. |

| `GET /api/items` | Saved items, newest first, `limit` and `offset`. |
| `POST /api/query` | `{question, topK}` returns the answer, its sources and token counts. |

Fetching reads the HTML as served, without running JavaScript, which covers ordinary articles and
documentation. A page that draws itself entirely client side has nothing in its HTML to read, so
it falls back to the page's own title and description, and says so plainly when there is not even
that. Running a headless browser would fix it and costs far more than it is worth here.

Also `DELETE /api/items/:id` to remove an item and its chunks, `GET /api/items/:id/chunks` to see
what retrieval works with, and `GET`/`DELETE /api/queries` for the history that makes an answer
survive a refresh.

An answer carries `[1]` markers matching a numbered `sources` array, each with the passage, its
item and a similarity score. The model cites only what it used, so a five source answer often has
two citations; the interface separates the ones it leaned on from the near misses.

Errors share one shape and carry a request id that matches the logs:

```jsonc
{ "error": { "code": "blocked_host", "message": "Refusing to fetch a private or local address: localhost" },
  "requestId": "5b45137c-8b81-4439-8685-ec18ce9068be" }
```

`400` your input, `404` unknown id, `429` rate limited, `500` our fault, `502` an upstream failed.
The 400 against 502 split matters: a URL you mistyped is worth fixing, a site that is down is not,
and folding both into 500 makes the API impossible to debug from outside.

## Decisions

**Chunking.** Split on the largest natural boundary that fits, then pack the pieces back up to 900
characters with 150 of overlap. Paragraphs first, then newlines, then sentence ends, and a blunt
character cut only when nothing else is left.

900 characters is roughly 200 tokens, small enough that a chunk is usually about one thing. An
embedding is a single point, so a chunk spanning five topics lands in the average of all five and
matches everything weakly. The overlap catches the sentence that falls across a boundary, which
would otherwise be in neither chunk and unreachable. Boundaries matter more than the numbers: a
chunk cut mid sentence embeds as near noise, which is why `text.slice(i, i + 900)` quietly ruins
retrieval. Chunks store their character offsets so a citation can point at the passage.

**Embeddings.** `all-MiniLM-L6-v2` locally through transformers.js, 384 dimensions. A hosted model
would retrieve better, but this one needs no key, costs nothing, works offline and keeps a network
round trip out of every save. Vectors are unit length, so cosine similarity is a dot product.
Swapping provider means rewriting `services/embedder.ts` and nothing else.

**Storage.** Vectors live beside the content in SQLite as raw float32 blobs, 1536 bytes each; JSON
would be three times the size and need parsing on every read. Search is a straight scan: score
everything, sort, keep the best five. Exact, no index to maintain, no extra service. A floor of
0.15 drops noise and at most three chunks may come from one item, so a long article cannot fill
every slot.

**Grounding.** Retrieval alone cannot tell a good match from a bad one. Asking a library about
deployment for "the migratory patterns of arctic terns" returns a deploy checklist at 0.207,
because *migrations* appears in both, while a fair question about releasing to production scored
0.185 against the same note. No threshold separates those, so the model is allowed to refuse: the
prompt permits only facts from the supplied sources and requires it to say when they do not answer
the question. Retrieval narrows the field, the model judges relevance. When nothing is retrieved,
no request is sent at all.

## Where it falls over

Every query reads every vector out of SQLite and scores it. Measured here on random 384 dimension
vectors:

| Chunks | Scan and sort | Vectors held |
| --- | --- | --- |
| 1,000 | 1ms | 2 MB |
| 100,000 | 52ms | 154 MB |
| 1,000,000 | 601ms | 1.5 GB |

The arithmetic is not the problem, which surprised me. A million dot products is 600ms. The
problem is 154 MB being read and rebuilt into Float32Arrays on *every* question, because nothing
is cached between requests. So the first fix is not an index but holding the vectors in memory and
reloading on ingest, which is a small change worth an order of magnitude. Past a million chunks
memory becomes the wall and an approximate index earns its keep, either `sqlite-vec` or Postgres
with `pgvector`.

Separately, ingest is synchronous: saving a link fetches, chunks and embeds before replying, so a
long article holds the connection for seconds.

## Production changes

Ingest would become a job returning immediately with a pending item, which also brings retries.
The embedding model name is stored per chunk and retrieval filters on it, so changing models today
silently hides older content and needs a backfill. Then the ordinary things: auth so a query is
not scanning every user's chunks, a unique constraint on URLs, rate limiting on `/query`, and
shipping the logs somewhere.

One security note. The URL fetcher refuses private and local addresses by hostname, which stops
the obvious attempts to make the server probe its own network, but not a public domain whose DNS
points inward. The full fix resolves the name first and checks the address it will connect to.

## Debugging

Every request gets an id, returned in `x-request-id` and every error body, and stamped on each log
line, so one string finds everything the server did. Logs are JSON lines: ingest records content
length and chunk count, retrieval records chunks scanned and top score, generation records model,
tokens and stop reason. A low top score means retrieval missed; a good score with a hedging answer
means the passage came back but did not hold the fact.

## Deploying

`render.yaml` describes both services. The API needs a persistent disk, with `DATABASE_FILE` and
`EMBEDDING_CACHE_DIR` pointing at it, or the library and the 90 MB model are discarded on every
deploy. Set `ANTHROPIC_API_KEY` and `ALLOWED_ORIGINS` (the frontend origin) on the API, and
`VITE_API_BASE_URL` (the API origin) on the frontend, which Vite inlines at build time.

`SEED_SAMPLE_DATA=true` fills an empty library with a few notes and one fetched page on startup,
so a host without a disk still has something to show after it restarts. It checks first and does
nothing once anything has been saved, and it is off unless you ask for it.

## Tests

Sixteen tests, `npm test`. They cover what fails quietly rather than loudly: the chunker (limits,
boundary preference, real overlap, offsets mapping back, a wall of text with no boundaries), the
vector helpers (blob round trip, identical scores 1, orthogonal scores 0, length mismatch throws)
and page extraction (scripts and navigation dropped, blocks kept apart, main region preferred).

There are no route tests. That is the first gap I would close, with `supertest` against
`createApp()`, which is already separate from the listening server for that reason.
