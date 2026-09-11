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
