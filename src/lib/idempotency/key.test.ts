import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateIdempotencyKey,
  isValidIdempotencyKey,
  normalizeIdempotencyKey,
} from "./key";

describe("Idempotency Key Utility", () => {
  it("generates a valid idempotency key satisfying 8-128 characters", () => {
    const key = generateIdempotencyKey();
    assert.equal(typeof key, "string");
    assert.equal(isValidIdempotencyKey(key), true);
    assert.equal(key.length >= 8 && key.length <= 128, true);
  });

  it("validates key length boundaries correctly", () => {
    assert.equal(isValidIdempotencyKey("1234567"), false); // 7 chars (too short)
    assert.equal(isValidIdempotencyKey("12345678"), true); // 8 chars
    assert.equal(isValidIdempotencyKey("a".repeat(128)), true); // 128 chars
    assert.equal(isValidIdempotencyKey("a".repeat(129)), false); // 129 chars (too long)
    assert.equal(isValidIdempotencyKey("  "), false);
  });

  it("preserves valid supplied key across retries", () => {
    const validKey = "custom-idempotency-key-12345";
    const result = normalizeIdempotencyKey(validKey);
    assert.equal(result, validKey);
  });

  it("generates a new key when input is missing or invalid", () => {
    const resultNull = normalizeIdempotencyKey(null);
    assert.equal(isValidIdempotencyKey(resultNull), true);

    const resultShort = normalizeIdempotencyKey("short");
    assert.equal(isValidIdempotencyKey(resultShort), true);
    assert.notEqual(resultShort, "short");
  });
});
