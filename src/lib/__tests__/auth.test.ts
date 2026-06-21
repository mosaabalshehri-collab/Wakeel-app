import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
} from "../auth.ts";

describe("auth password hashing", () => {
  test("كلمة المرور المشفرة لا تساوي النص الأصلي", async () => {
    const hash = await hashPassword("mypassword123");
    assert.notEqual(hash, "mypassword123");
  });

  test("verifyPassword يرجع true لكلمة المرور الصحيحة", async () => {
    const hash = await hashPassword("correct-password");
    const valid = await verifyPassword("correct-password", hash);
    assert.equal(valid, true);
  });

  test("verifyPassword يرجع false لكلمة مرور خاطئة", async () => {
    const hash = await hashPassword("correct-password");
    const valid = await verifyPassword("wrong-password", hash);
    assert.equal(valid, false);
  });

  test("نفس كلمة المرور تنتج hash مختلف في كل مرة (salt عشوائي)", async () => {
    const hash1 = await hashPassword("samepassword");
    const hash2 = await hashPassword("samepassword");
    assert.notEqual(hash1, hash2);
  });
});

describe("auth JWT tokens", () => {
  test("signToken وverifyToken: رمز صحيح يرجع نفس البيانات", () => {
    const payload = { userId: 42, email: "test@test.com" };
    const token = signToken(payload);
    const decoded = verifyToken(token);

    assert.equal(decoded?.userId, 42);
    assert.equal(decoded?.email, "test@test.com");
  });

  test("verifyToken يرجع null لرمز غير صالح", () => {
    const decoded = verifyToken("this.is.not.a.valid.token");
    assert.equal(decoded, null);
  });

  test("verifyToken يرجع null لرمز فارغ", () => {
    const decoded = verifyToken("");
    assert.equal(decoded, null);
  });
});
