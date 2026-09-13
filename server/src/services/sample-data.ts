import { itemRepository } from "../repositories/item.repository.js";
import { ingestContent } from "./ingest.service.js";
import type { Logger } from "../lib/logger.js";

const NOTES = [
  {
    title: "Why this uses SQLite instead of Postgres",
    text: `One process, one file, no service to run alongside the app. For a single user library
of a few thousand chunks a brute force scan is exact and fast enough, and an index would be
complexity without a payoff yet. The point at which that flips is roughly a hundred thousand
chunks, where reloading every vector on each question starts to dominate. The fix at that point
is caching the vectors in memory, and only past a million is an approximate index worth its
maintenance.`,
  },
  {
    title: "Chunking tradeoffs for retrieval",
    text: `An embedding is a single point in space, so a chunk covering five topics lands in the
average of all five and matches every query weakly rather than any one strongly. Smaller chunks
are sharper but lose the context around them. Around two hundred tokens with a small overlap is a
reasonable middle ground. The overlap exists for the sentence that falls across a boundary, which
would otherwise belong to neither chunk and be unreachable. Splitting on paragraph and sentence
boundaries matters more than the exact size, because a chunk cut mid sentence embeds as noise.`,
  },
  {
    title: "Prompt caching economics",
    text: `Cache writes bill at roughly 1.25x a normal input token and cache reads at roughly 0.1x,
so a stable prefix pays for itself after about two calls. The catch is that caching is a prefix
match: any byte that changes invalidates everything after it. So anything that varies per request,
a timestamp or a user id or the question itself, has to sit after the last cache breakpoint. If
the cache read count stays at zero across repeated calls, something upstream is changing that you
have not noticed.`,
  },
  {
    title: "Postmortem: the deploy that emptied the library",
    text: `The service came back healthy after a deploy but every saved item was gone. The database
lived on the container filesystem rather than a mounted disk, so it was thrown away with the old
container. Health checks passed because the app was fine, only the data was missing. Two lessons.
State on a host needs an explicit persistent volume, and a health check that only proves the
process is up will not tell you the thing users care about is intact.`,
  },
  {
    title: "Marathon taper",
    text: `Cut weekly volume by about a third three weeks out, then in half two weeks out, keeping
some intensity so the legs stay sharp. The taper feels wrong. You get restless and convinced you
are losing fitness, which is the point at which people ruin months of work with one last long run.
Fitness is already banked by then. The only thing left to gain is freshness.`,
  },
];

const SAMPLE_LINK = "https://www.sqlite.org/whentouse.html";

// Fills an empty library so a fresh deployment is not a blank page. Skipped the
// moment anything has been saved, so it never touches real content.
export async function seedSampleData(log: Logger): Promise<void> {
  if (itemRepository.countAll() > 0) {
    log.info("sample data skipped, the library is not empty");
    return;
  }

  for (const note of NOTES) {
    await ingestContent({ sourceType: "note", title: note.title, text: tidy(note.text) }, log);
  }

  // A fetched page shows URL ingestion works, but it must not stop startup.
  try {
    await ingestContent({ sourceType: "url", url: SAMPLE_LINK }, log);
  } catch (error) {
    log.warn("sample link could not be fetched", {
      url: SAMPLE_LINK,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  log.info("sample data added", { items: itemRepository.countAll() });
}

function tidy(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}
