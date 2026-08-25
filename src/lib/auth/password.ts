import "server-only";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Minimum viable password policy, enforced server-side on signup/password change. */
export function isPasswordStrongEnough(plain: string): boolean {
  return (
    plain.length >= 8 &&
    /[a-zA-Z]/.test(plain) &&
    /[0-9]/.test(plain)
  );
}
