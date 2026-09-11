import assert from "node:assert/strict";
import { test } from "node:test";
import { blobToVector, dotProduct, vectorToBlob } from "./vector.js";

test("a vector survives a round trip through a blob", () => {
  const original = new Float32Array([0.5, -0.25, 0, 1]);
  const restored = blobToVector(vectorToBlob(original));
  assert.deepEqual(Array.from(restored), Array.from(original));
});

test("identical unit vectors score 1", () => {
  const vector = new Float32Array([1, 0, 0]);
  assert.equal(dotProduct(vector, vector), 1);
});

test("orthogonal vectors score 0", () => {
  assert.equal(dotProduct(new Float32Array([1, 0]), new Float32Array([0, 1])), 0);
});

test("comparing different lengths throws", () => {
  assert.throws(() => dotProduct(new Float32Array([1]), new Float32Array([1, 2])));
});
