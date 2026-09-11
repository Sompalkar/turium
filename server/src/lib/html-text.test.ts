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
