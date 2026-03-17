import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // 96-bit IV for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Output format: <iv_hex>:<ciphertext_hex>:<tag_hex>
 */
export function encrypt(plaintext: string, secretHex: string): string {
  const key = Buffer.from(secretHex, 'hex');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

/**
 * Decrypt a string produced by encrypt().
 */
export function decrypt(ciphertext: string, secretHex: string): string {
  const [ivHex, dataHex, tagHex] = ciphertext.split(':');
  if (!ivHex || !dataHex || !tagHex) {
    throw new Error('Invalid encrypted credential format');
  }
  const key = Buffer.from(secretHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final('utf8');
}
