import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import test from "node:test";
import {
  createOwnerSession, OWNER_COOKIE, OWNER_SESSION_SECONDS, ownerKeyMatches, ownerSessionValid,
  readPublishingBody, requireOwner, requirePublishingOrigin,
} from "./owner-access.ts";
import { ownerKeySkippedForTesting } from "./owner-key-test-mode.ts";

process.env.GLINT_LABS_OWNER_KEY = randomBytes(32).toString("hex");
test("owner keys and signed sessions reject missing, wrong, forged and expired credentials", async () => {
  assert.equal(await ownerKeyMatches(process.env.GLINT_LABS_OWNER_KEY!), true);
  assert.equal(await ownerKeyMatches("wrong"), false);
  const session = await createOwnerSession();
  assert.equal(await ownerSessionValid(`${OWNER_COOKIE}=${session}`), true);
  assert.equal(await ownerSessionValid(null), false);
  const parts = session.split(".");
  parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);
  assert.equal(await ownerSessionValid(`${OWNER_COOKIE}=${parts.join(".")}`), false);
  const payload = `${Date.now() - 1000}.${"a".repeat(32)}`;
  const signed = createHmac("sha256", process.env.GLINT_LABS_OWNER_KEY!).update(payload).digest("base64url");
  assert.equal(await ownerSessionValid(`${OWNER_COOKIE}=${payload}.${signed}`), false);
});
test("publishing unlock lasts seven days, expires at its deadline, and rejects longer sessions", async (t) => {
  const issuedAt = Date.parse("2026-10-21T04:00:00Z");
  let now = issuedAt;
  t.mock.method(Date, "now", () => now);
  assert.equal(OWNER_SESSION_SECONDS, 7 * 24 * 60 * 60);
  const session = await createOwnerSession();
  const cookie = `${OWNER_COOKIE}=${session}`;
  const expiresAt = Number(session.split(".")[0]);
  assert.equal(expiresAt, issuedAt + 7 * 24 * 60 * 60 * 1000);
  now = issuedAt + 8 * 60 * 60 * 1000;
  assert.equal(await ownerSessionValid(cookie), true);
  now = expiresAt - 1;
  assert.equal(await ownerSessionValid(cookie), true);
  now = expiresAt;
  assert.equal(await ownerSessionValid(cookie), false);

  now = issuedAt;
  const tooLongPayload = `${expiresAt + 1000}.${"b".repeat(32)}`;
  const tooLongSignature = createHmac("sha256", process.env.GLINT_LABS_OWNER_KEY!).update(tooLongPayload).digest("base64url");
  assert.equal(await ownerSessionValid(`${OWNER_COOKIE}=${tooLongPayload}.${tooLongSignature}`), false);
  const oldPayload = `${issuedAt + 8 * 60 * 60 * 1000}.${"c".repeat(32)}`;
  const oldSignature = createHmac("sha256", process.env.GLINT_LABS_OWNER_KEY!).update(oldPayload).digest("base64url");
  assert.equal(await ownerSessionValid(`${OWNER_COOKIE}=${oldPayload}.${oldSignature}`), true);
});
test("writes require both an allowed site origin and owner session", async () => {
  const cookie = `${OWNER_COOKIE}=${await createOwnerSession()}`;
  await requireOwner(new Request("http://localhost:3010", { headers: { origin: "http://localhost:3010", cookie } }));
  requirePublishingOrigin(new Request("https://fm6v0s04-3010.usw2.devtunnels.ms", {
    headers: { origin: "https://fm6v0s04-3010.usw2.devtunnels.ms" },
  }));
  assert.throws(() => requirePublishingOrigin(new Request("http://localhost:3010")), /Open Studio/);
  await assert.rejects(requireOwner(new Request("http://localhost:3010", { headers: { origin: "https://example.com", cookie } })), /Open Studio/);
  await assert.rejects(requireOwner(new Request("http://localhost:3010", { headers: { origin: "http://localhost:3010" } })), /Unlock publishing/);
});
test("owner-key skip requires explicit private test mode and still checks publishing origins", async () => {
  const originalSkip = process.env.GLINT_LABS_SKIP_OWNER_KEY;
  const originalPreview = process.env.GLINT_LABS_UNSIGNED_PREVIEW;
  const request = new Request("http://localhost:3010", { headers: { origin: "http://localhost:3010" } });
  try {
    delete process.env.GLINT_LABS_SKIP_OWNER_KEY;
    process.env.GLINT_LABS_UNSIGNED_PREVIEW = "1";
    assert.equal(ownerKeySkippedForTesting(), false);
    await assert.rejects(requireOwner(request), /Unlock publishing/);

    process.env.GLINT_LABS_SKIP_OWNER_KEY = "1";
    delete process.env.GLINT_LABS_UNSIGNED_PREVIEW;
    assert.equal(ownerKeySkippedForTesting(), false);
    await assert.rejects(requireOwner(request), /Unlock publishing/);

    process.env.GLINT_LABS_UNSIGNED_PREVIEW = "1";
    assert.equal(ownerKeySkippedForTesting(), true);
    assert.equal(await ownerSessionValid(null), true);
    await requireOwner(request);
    await assert.rejects(requireOwner(new Request("http://localhost:3010")), /Open Studio/);
    await assert.rejects(requireOwner(new Request("http://localhost:3010", {
      headers: { origin: "https://example.com" },
    })), /Open Studio/);

    process.env.GLINT_LABS_SKIP_OWNER_KEY = "0";
    assert.equal(await ownerSessionValid(null), false);
    await assert.rejects(requireOwner(request), /Unlock publishing/);
  } finally {
    if (originalSkip === undefined) delete process.env.GLINT_LABS_SKIP_OWNER_KEY;
    else process.env.GLINT_LABS_SKIP_OWNER_KEY = originalSkip;
    if (originalPreview === undefined) delete process.env.GLINT_LABS_UNSIGNED_PREVIEW;
    else process.env.GLINT_LABS_UNSIGNED_PREVIEW = originalPreview;
  }
});
test("request bodies are bounded even without a Content-Length header", async () => {
  assert.deepEqual(await readPublishingBody(new Request("http://localhost", { method: "POST", body: "abc" }), 3), new TextEncoder().encode("abc"));
  await assert.rejects(readPublishingBody(new Request("http://localhost", { method: "POST", body: "abcd" }), 3), /too large/);
  await assert.rejects(readPublishingBody(new Request("http://localhost"), 3), /empty/);
});
