import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeOrigin, parseAllowedOrigins } from "./origins.js";

test("a trailing slash does not change the origin", () => {
  assert.equal(normalizeOrigin("https://site.com/"), "https://site.com");
  assert.equal(normalizeOrigin("https://site.com///"), "https://site.com");
});

test("case and surrounding space do not matter", () => {
  assert.equal(normalizeOrigin("  HTTPS://Site.com "), "https://site.com");
});

test("a port is kept", () => {
  assert.equal(normalizeOrigin("http://localhost:5173/"), "http://localhost:5173");
});

test("a list splits on commas and drops blanks", () => {
  assert.deepEqual(parseAllowedOrigins("https://a.com/, ,https://b.com"), [
    "https://a.com",
    "https://b.com",
  ]);
});

test("an empty setting allows nothing", () => {
  assert.deepEqual(parseAllowedOrigins(""), []);
});
