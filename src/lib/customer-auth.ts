import { createHmac, timingSafeEqual, randomBytes, scryptSync } from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.ADMIN_SECRET || "alwaha-store-secret-key-2025-fallback";
export const CUSTOMER_COOKIE = "wh_customer_session";

// ============ تشفير كلمة المرور (scrypt) ============
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}.${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(".");
    if (!salt || !hash) return false;
    const computed = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}

// ============ جلسة العميل (HMAC موقّعة لمدة 30 يوم) ============
export function createCustomerToken(customerId: string): string {
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = `${customerId}.${expires}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyCustomerToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [customerId, expires, sig] = parts;
  const expected = createHmac("sha256", SECRET).update(`${customerId}.${expires}`).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  if (parseInt(expires) < Date.now()) return null;
  return customerId;
}

export async function getCustomerId(): Promise<string | null> {
  const cookieStore = await cookies();
  return verifyCustomerToken(cookieStore.get(CUSTOMER_COOKIE)?.value);
}
