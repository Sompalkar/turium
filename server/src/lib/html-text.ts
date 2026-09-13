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
  "figure",
  "[aria-hidden='true']",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
  "[role='complementary']",
  "[role='search']",
].join(",");

// Menus and link lists leave behind stray one or two character lines like "v t e".
const MIN_LINE_LENGTH = 3;

// Sites often mark menus with a class rather than a nav element. Matching on the
// class alone is not enough: Wikipedia puts "main-menu" on <html>, so a careless
// selector deletes the article. Only drop a match that also looks like navigation.
const MENU_HINTS = "[class*='menu' i],[class*='nav' i],[class*='sidebar' i],[class*='breadcrumb' i],[id*='menu' i],[id*='nav' i],[id*='sidebar' i],[id*='breadcrumb' i]";
const STRUCTURAL = "html,body,main,article,[role='main']";
const SHORT_MENU_CHARS = 200;
const LINK_DENSITY = 0.6;

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

  removeMenus($);

  // Without this the text of neighbouring blocks runs together into one word.
  $(BLOCK_SELECTORS).after("\n");

  const container =
    CONTENT_SELECTORS.map((selector) => $(selector).first())
      .find((node) => node.length > 0 && node.text().trim().length > 200) ?? $("body");

  return { title, text: normalizeWhitespace(container.text()) };
}

// A menu is short, or mostly links, or both. Real prose is neither.
function removeMenus($: cheerio.CheerioAPI): void {
  $(MENU_HINTS).each((_, element) => {
    const node = $(element);
    if (node.is(STRUCTURAL)) return;

    const text = node.text().replace(/\s+/g, " ").trim();
    if (text.length === 0) {
      node.remove();
      return;
    }
    if (text.length < SHORT_MENU_CHARS) {
      node.remove();
      return;
    }

    const linkText = node.find("a").text().replace(/\s+/g, " ").trim();
    if (linkText.length / text.length > LINK_DENSITY) node.remove();
  });
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
