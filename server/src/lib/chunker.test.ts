import assert from "node:assert/strict";
import { test } from "node:test";
import { chunkText } from "./chunker.js";

const options = { maxChars: 100, overlapChars: 30 };

test("empty text produces no chunks", () => {
  assert.deepEqual(chunkText("   \n  ", options), []);
});

test("short text stays in one chunk", () => {
  const chunks = chunkText("A single short note.", options);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0]!.text, "A single short note.");
});

test("no chunk goes over the limit", () => {
  const text = Array.from({ length: 20 }, (_, i) => `Sentence number ${i} with some filler words.`).join(" ");
  for (const chunk of chunkText(text, options)) {
    assert.ok(chunk.text.length <= options.maxChars, `chunk was ${chunk.text.length} chars`);
  }
});

test("paragraph breaks are preferred over sentence breaks", () => {
  const text = `${"a".repeat(60)}\n\n${"b".repeat(60)}`;
  const chunks = chunkText(text, options);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0]!.text, "a".repeat(60));
  assert.equal(chunks[1]!.text, "b".repeat(60));
});

// Offsets bracket the passage. Whitespace between segments can differ from the source.
test("offsets point back at the original text", () => {
  const text = "First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph is a bit longer than the others.";
  const collapse = (value: string) => value.replace(/\s+/g, " ").trim();

  for (const chunk of chunkText(text, options)) {
    assert.equal(collapse(text.slice(chunk.charStart, chunk.charEnd)), collapse(chunk.text));
  }
});

test("consecutive chunks overlap", () => {
  const text = Array.from({ length: 12 }, (_, i) => `Line ${i} of the note.`).join("\n");
  const chunks = chunkText(text, options);
  assert.ok(chunks.length > 1);
  for (let i = 1; i < chunks.length; i += 1) {
    assert.ok(chunks[i]!.charStart < chunks[i - 1]!.charEnd, `chunk ${i} did not overlap the one before it`);
  }
});

test("a wall of text with no boundaries is still split", () => {
  const chunks = chunkText("x".repeat(250), options);
  assert.equal(chunks.length, 3);
  assert.ok(chunks.every((chunk) => chunk.text.length <= options.maxChars));
});
