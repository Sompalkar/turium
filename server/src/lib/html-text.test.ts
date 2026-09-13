import assert from "node:assert/strict";
import { test } from "node:test";
import { extractReadableText } from "./html-text.js";

test("takes the title and drops scripts and styles", () => {
  const page = extractReadableText(
    `<html><head><title> A Page </title><style>body{color:red}</style></head>
     <body><p>Real content here.</p><script>alert(1)</script></body></html>`,
  );

  assert.equal(page.title, "A Page");
  assert.equal(page.text, "Real content here.");
});

test("neighbouring blocks do not run together", () => {
  const page = extractReadableText("<body><h1>Heading</h1><p>Paragraph.</p></body>");
  assert.equal(page.text, "Heading\nParagraph.");
});

test("drops navigation, footers and menu leftovers", () => {
  const page = extractReadableText(
    `<body>
       <nav><a href="/a">Home</a></nav>
       <div role="navigation"><span>v</span><span>t</span><span>e</span></div>
       <main><p>The part worth keeping.</p></main>
       <footer>Copyright notice</footer>
     </body>`,
  );

  assert.equal(page.text, "The part worth keeping.");
});

test("prefers the main region over the whole body", () => {
  const body = `<body><div>Site furniture</div><main><p>${"Substantial content. ".repeat(20)}</p></main></body>`;
  const page = extractReadableText(body);

  assert.ok(page.text.startsWith("Substantial content."));
  assert.ok(!page.text.includes("Site furniture"));
});

test("a page with no readable text comes back empty", () => {
  assert.equal(extractReadableText("<body><script>var a = 1;</script></body>").text, "");
});

test("menus marked with a class are dropped too", () => {
  const page = extractReadableText(
    `<body>
       <div class="menu mainmenu"><ul><li><a href="/">Home</a><li><a href="/docs">Docs</a></ul></div>
       <div id="sidebar"><a href="/x">Related</a></div>
       <p>The paragraph that matters.</p>
     </body>`,
  );

  assert.equal(page.text, "The paragraph that matters.");
});

test("a word containing nav in prose is not treated as a menu", () => {
  const page = extractReadableText("<body><p>We had to navigate the tradeoffs carefully.</p></body>");
  assert.equal(page.text, "We had to navigate the tradeoffs carefully.");
});

// Wikipedia puts "main-menu" classes on <html>, which a careless selector treats
// as one enormous menu and deletes the whole article.
test("a menu class on a wrapper does not delete the article", () => {
  const article = "This sentence is the article body and must survive extraction. ".repeat(12);
  const page = extractReadableText(
    `<html class="vector-feature-main-menu-pinned-disabled"><body class="skin-vector">
       <div class="mw-navigation"><a href="/a">Jump</a><a href="/b">Search</a></div>
       <p>${article}</p>
     </body></html>`,
  );

  assert.ok(page.text.includes("must survive extraction"));
  assert.ok(!page.text.includes("Jump"));
});

test("a link heavy block is dropped even when it is long", () => {
  const links = Array.from({ length: 40 }, (_, i) => `<a href="/p${i}">Related article number ${i}</a>`).join(" ");
  const page = extractReadableText(`<body><div class="navbox">${links}</div><p>The actual prose.</p></body>`);

  assert.equal(page.text, "The actual prose.");
});
