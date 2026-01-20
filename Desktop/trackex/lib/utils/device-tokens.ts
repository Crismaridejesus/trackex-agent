import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Hash a device token using SHA-256 for O(1) database lookup.
 * 
 * SECURITY NOTE: Device tokens are 64-character cryptographically random hex strings
 * (256 bits of entropy). SHA-256 is appropriate here because:
 * 1. The input has high entropy (not a user-chosen password)
 * 2. We need fast, deterministic hashing for database indexing
 * 3. The token itself provides brute-force resistance, not the hash
 * 
 * This replaces the previous bcrypt approach which required O(n) scanning
 * because bcrypt is non-deterministic (different salt per hash).
 */
export function hashDeviceToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Legacy async version for backward compatibility during migration.
 * New code should use the synchronous hashDeviceToken directly.
 */
export async function hashDeviceTokenAsync(token: string): Promise<string> {
  return hashDeviceToken(token)
}

/**
 * Verify a device token against its hash.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyDeviceToken(token: string, storedHash: string): boolean {
  const tokenHash = hashDeviceToken(token)
  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(tokenHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    )
  } catch {
    // If buffers have different lengths, they don't match
    return false
  }
}

/**
 * Legacy async version for backward compatibility.
 */
export async function verifyDeviceTokenAsync(token: string, storedHash: string): Promise<boolean> {
  return verifyDeviceToken(token, storedHash)
}

/**
 * Check if a hash is a legacy bcrypt hash (starts with $2a$, $2b$, or $2y$).
 * Used during migration to handle both old bcrypt and new SHA-256 hashes.
 */
export function isLegacyBcryptHash(hash: string): boolean {
  return hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')
}

/**
 * Verify a token that might be stored with either bcrypt (legacy) or SHA-256 (new).
 * Automatically detects hash type and uses appropriate verification.
 */
export async function verifyDeviceTokenWithMigration(
  token: string, 
  storedHash: string
): Promise<{ valid: boolean; needsMigration: boolean }> {
  if (isLegacyBcryptHash(storedHash)) {
    // Legacy bcrypt verification
    const valid = await bcrypt.compare(token, storedHash)
    return { valid, needsMigration: valid } // Only migrate if token is valid
  } else {
    // New SHA-256 verification
    const valid = verifyDeviceToken(token, storedHash)
    return { valid, needsMigration: false }
  }
}

export function generateSecureSecret(): string {
  return crypto.randomBytes(64).toString('hex')
}
