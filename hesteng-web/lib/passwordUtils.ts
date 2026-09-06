import "server-only";

import { hash, verify, argon2id } from "argon2";
import type { HashOptions } from "argon2";

const ARGON2_OPTIONS: HashOptions = {
  type: argon2id,
};

export async function hashPassword(password: string) {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(password: string, passwordHash: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
