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
