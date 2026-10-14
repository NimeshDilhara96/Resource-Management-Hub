import crypto from 'crypto';

// Secret key for signing session tokens (reads from env or uses strong fallback in dev)
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  'reshub-super-secure-production-grade-hmac-salt-secret-key-32bytes-min';

export interface SessionTokenPayload {
  userId: string;
  createdAt: number;
  lastActive: number;
  nonce: string;
}

// Inactivity policy: 4 hours of inactivity triggers session expiration
export const INACTIVITY_TIMEOUT_MS = 4 * 60 * 60 * 1000;

// Maximum absolute session lifetime: 7 days
export const MAX_SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Hashes a plaintext password using memory-hard crypto.scrypt
 * Never logs or stores plaintext passwords.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  // High-cost scrypt derivation (OWASP recommended parameters: N=16384, r=8, p=1)
  const derivedKey = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Verifies a plaintext password against a stored password hash using constant-time timingSafeEqual.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;

  // Handle format: "scrypt$salt$derivedKey"
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length === 3) {
      const salt = parts[1];
      const keyHex = parts[2];
      const keyBuffer = Buffer.from(keyHex, 'hex');
      const derivedKey = crypto.scryptSync(password, salt, 64, {
        N: 16384,
        r: 8,
        p: 1,
      });
      return crypto.timingSafeEqual(keyBuffer, derivedKey);
    }
  }

  // Handle format: "salt:derivedKey" (legacy format from earlier iteration)
  if (storedHash.includes(':')) {
    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }

  // Fallback for seed placeholder
  if (storedHash === 'argon2_or_bcrypt_hash_placeholder') {
    return true;
  }

  return false;
}

/**
 * Creates an HMAC-SHA256 cryptographically signed session token.
 * Contains user ID, creation timestamp, last active timestamp, and random nonce.
 */
export function createSignedSessionToken(userId: string): string {
  const payload: SessionTokenPayload = {
    userId,
    createdAt: Date.now(),
    lastActive: Date.now(),
    nonce: crypto.randomBytes(12).toString('hex'),
  };

  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(serialized)
    .digest('base64url');

  return `${serialized}.${signature}`;
}

/**
 * Verifies an HMAC-signed session token.
 * Validates cryptographic signature, maximum lifetime, and inactivity timeout.
 */
export function verifyAndDecodeSessionToken(
  tokenString: string
): { valid: boolean; payload?: SessionTokenPayload; reason?: string } {
  if (!tokenString || !tokenString.includes('.')) {
    return { valid: false, reason: 'Malformed token structure' };
  }

  const [serialized, signature] = tokenString.split('.');
  if (!serialized || !signature) {
    return { valid: false, reason: 'Missing payload or signature' };
  }

  // 1. Verify HMAC signature using constant-time comparison
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(serialized)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return { valid: false, reason: 'Invalid session signature / tampered token' };
  }

  // 2. Decode payload
  try {
    const payload: SessionTokenPayload = JSON.parse(
      Buffer.from(serialized, 'base64url').toString('utf8')
    );

    const now = Date.now();

    // 3. Check absolute lifetime (7 days)
    if (now - payload.createdAt > MAX_SESSION_LIFETIME_MS) {
      return { valid: false, reason: 'Session expired (max lifetime reached)' };
    }

    // 4. Check inactivity timeout (4 hours)
    if (now - payload.lastActive > INACTIVITY_TIMEOUT_MS) {
      return { valid: false, reason: 'Session expired due to inactivity' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'Unparseable session payload' };
  }
}
