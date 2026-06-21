import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit } from "../rateLimit.ts";

describe("checkRateLimit", () => {
  test("يسمح بالمحاولات ضمن الحد المسموح", () => {
    const key = `test-${Date.now()}-1`;
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(key, 5, 60);
      assert.equal(result.allowed, true);
    }
  });

  test("يرفض المحاولة بعد تجاوز الحد المسموح", () => {
    const key = `test-${Date.now()}-2`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, 3, 60);
    }
    const result = checkRateLimit(key, 3, 60);
    assert.equal(result.allowed, false);
    assert.ok(result.retryAfterSeconds > 0);
  });

  test("مفاتيح مختلفة لها عدّادات مستقلة", () => {
    const keyA = `test-${Date.now()}-a`;
    const keyB = `test-${Date.now()}-b`;

    for (let i = 0; i < 3; i++) checkRateLimit(keyA, 3, 60);
    // المفتاح A وصل الحد، لكن B لسه ما استخدم
    const resultB = checkRateLimit(keyB, 3, 60);
    assert.equal(resultB.allowed, true);
  });
});
