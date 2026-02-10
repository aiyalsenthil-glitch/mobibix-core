/**
 * ════════════════════════════════════════════════════
 * AES-256-GCM Encryption Utility
 * ════════════════════════════════════════════════════
 *
 * Used for encrypting/decrypting per-tenant WhatsApp API tokens.
 *
 * SECURITY:
 * - AES-256-GCM (authenticated encryption)
 * - Random IV per encryption (no IV reuse)
 * - Auth tag appended for integrity verification
 * - Master key from env: ENCRYPTION_MASTER_KEY (64 hex chars = 32 bytes)
 *
 * FORMAT: iv:authTag:ciphertext (all hex encoded)
 */
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getMasterKey(): Buffer {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY env variable is required for token encryption. Must be 64 hex characters (32 bytes).',
    );
  }
  if (key.length !== 64) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY must be exactly 64 hex characters (32 bytes).',
    );
  }
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns: iv:authTag:ciphertext (hex encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string using AES-256-GCM.
 * Expects: iv:authTag:ciphertext (hex encoded)
 */
export function decrypt(encryptedData: string): string {
  const key = getMasterKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected iv:authTag:ciphertext');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const ciphertext = parts[2];

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: ${iv.length}, expected ${IV_LENGTH}`);
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: ${authTag.length}, expected ${AUTH_TAG_LENGTH}`);
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a new random 32-byte master key (for initial setup).
 * Run: npx ts-node -e "import { generateMasterKey } from './src/common/utils/crypto.util'; console.log(generateMasterKey())"
 */
export function generateMasterKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
