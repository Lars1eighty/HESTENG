import "server-only";

import { createHash, randomBytes } from "crypto";

const TOKEN_BYTE_LENGTH = 32;

export function generateAuthToken() {
  return randomBytes(TOKEN_BYTE_LENGTH).toString("base64url");
}

export function tokenHash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
