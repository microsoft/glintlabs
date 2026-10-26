import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ownerKeySkippedForTesting } from "./owner-key-test-mode.ts";

export const OWNER_COOKIE = "glint-labs-owner";
export const OWNER_SESSION_SECONDS = 7 * 24 * 60 * 60;
export const ownerKeyPath = path.join(process.env.LOCALAPPDATA ?? os.homedir(), "GlintLabs", "studio-owner-key");

export async function getOwnerKey() {
  if (process.env.GLINT_LABS_OWNER_KEY) return process.env.GLINT_LABS_OWNER_KEY;
  await mkdir(path.dirname(ownerKeyPath), { recursive: true, mode: 0o700 });
  try {
    await writeFile(ownerKeyPath, randomBytes(24).toString("base64url"), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
  }
  const key = (await readFile(ownerKeyPath, "utf8")).trim();
  if (key.length < 24) throw new Error("The owner key is invalid. Regenerate it on the computer hosting Studio.");
  return key;
}

export async function ownerKeyMatches(candidate: string) {
  const expected = createHash("sha256").update(await getOwnerKey()).digest();
  return timingSafeEqual(expected, createHash("sha256").update(candidate).digest());
}

export async function createOwnerSession() {
  const payload = `${Date.now() + OWNER_SESSION_SECONDS * 1000}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${createHmac("sha256", await getOwnerKey()).update(payload).digest("base64url")}`;
}

export async function ownerSessionValid(cookieHeader: string | null) {
  if (ownerKeySkippedForTesting()) return true;
  const cookie = cookieHeader?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${OWNER_COOKIE}=`))?.slice(OWNER_COOKIE.length + 1);
  if (!cookie || !/^\d{13}\.[a-f0-9]{32}\.[A-Za-z0-9_-]{43}$/.test(cookie)) return false;
  const [expires, nonce, signature] = cookie.split(".");
  if (Number(expires) <= Date.now() || Number(expires) > Date.now() + OWNER_SESSION_SECONDS * 1000) return false;
  const expected = createHmac("sha256", await getOwnerKey()).update(`${expires}.${nonce}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "base64url"));
}

export class OwnerRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function requirePublishingOrigin(request: Request) {
  const allowed = new Set([
    "http://127.0.0.1:3010",
    "http://localhost:3010",
    "https://fm6v0s04-3010.usw2.devtunnels.ms",
  ]);
  if (!allowed.has(request.headers.get("origin") ?? "")) {
    throw new OwnerRequestError("Open Studio on your Glint Labs site before publishing.", 403);
  }
}

export async function requireOwner(request: Request) {
  requirePublishingOrigin(request);
  if (!await ownerSessionValid(request.headers.get("cookie"))) {
    throw new OwnerRequestError("Unlock publishing with your owner key, then try again.", 401);
  }
}

export async function readPublishingBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new OwnerRequestError("The request is empty. Try again.", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    length += next.value.length;
    if (length > limit) {
      await reader.cancel();
      throw new OwnerRequestError("The request is too large. Reduce the upload and try again.", 413);
    }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
