import * as cheerio from "cheerio";

const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "[aria-hidden='true']",
].join(",");

const BLOCK_SELECTORS = "p,div,section,article,h1,h2,h3,h4,h5,h6,li,br,tr,blockquote,pre,figcaption";

// Prefer the tags that usually hold the real content, fall back to the whole body.
const CONTENT_SELECTORS = ["article", "main", "[role='main']"];

export interface ExtractedPage {
  title: string | null;
  text: string;
}

export function extractReadableText(html: string): ExtractedPage {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || null;

  $(NOISE_SELECTORS).remove();

  // Without this the text of neighbouring blocks runs together into one word.
  $(BLOCK_SELECTORS).after("\n");

  const container =
    CONTENT_SELECTORS.map((selector) => $(selector).first())
      .find((node) => node.length > 0 && node.text().trim().length > 200) ?? $("body");

  return { title, text: normalizeWhitespace(container.text()) };
}

// Collapse the ragged whitespace that HTML leaves behind, but keep paragraph breaks.
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter((line, index, lines) => line.length > 0 || lines[index - 1]?.length > 0)
    .join("\n")
    .trim();
}
