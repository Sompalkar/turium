import { config } from "../config.js";
import { badGateway, badRequest } from "../lib/errors.js";
import { extractReadableText, type ExtractedPage } from "../lib/html-text.js";
import { parseFetchableUrl } from "../lib/url-guard.js";
import type { Logger } from "../lib/logger.js";

export async function fetchPage(rawUrl: string, log: Logger): Promise<ExtractedPage> {
  const url = parseFetchableUrl(rawUrl);
  const startedAt = Date.now();

  const response = await requestWithTimeout(url);
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    throw badGateway("fetch_failed", `The page responded with ${response.status}`, {
      url: url.href,
      status: response.status,
    });
  }
  if (!contentType.includes("html") && !contentType.includes("text/plain")) {
    throw badRequest("unsupported_content_type", `Only HTML and plain text pages are supported, got ${contentType || "no content type"}`);
  }

  const body = await readCapped(response);
  const page = contentType.includes("html")
    ? extractReadableText(body)
    : { title: null, text: body.trim() };

  if (page.text.length === 0) {
    throw badRequest("empty_page", "The page was fetched but had no readable text. It may be rendered entirely with JavaScript.");
  }

  log.info("page fetched", {
    url: url.href,
    status: response.status,
    textLength: page.text.length,
    durationMs: Date.now() - startedAt,
  });

  return page;
}

async function requestWithTimeout(url: URL): Promise<Response> {
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(config.urlFetch.timeoutMs),
      headers: { "user-agent": config.urlFetch.userAgent, accept: "text/html,text/plain" },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw badGateway("fetch_timeout", `The page did not respond within ${config.urlFetch.timeoutMs}ms`);
    }
    throw badGateway("fetch_failed", `Could not reach ${url.href}`, {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

// Stream the body so an enormous page is rejected instead of filling memory.
async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > config.urlFetch.maxBytes) {
      await reader.cancel();
      throw badRequest("page_too_large", `The page is larger than the ${config.urlFetch.maxBytes} byte limit`);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString("utf8");
}
