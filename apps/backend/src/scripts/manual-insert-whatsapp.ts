import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

// --- Configuration ---
const TENANT_ID = 'cmletvi280000okle8frjy21j';
const WABA_ID = '2390091688105540';
const PHONE_NUMBER_ID = '1042097638975961';
const PHONE_NUMBER = '919500588647'; // Clean number from context/user
const ACCESS_TOKEN =
  'EAAaWaisq58kBQqK6lj4zH4DRGRPXjYXdjk39stGH6a4efjzWZAcJJIk5cdfW3dZCQewpZBk7I336h7514l9KggCC2WyUpmup4mbLEYx9qdESEgkAz7SEZBUgE9tajk4nef6ImOqeWiXw8qJ2uqk0NvLfvnCij2sLR9aKZBshguw4BrL6qskDkIwstJZCZB4oGRLZCVfFvCdsZAgHYtrZBjNtu1weFZBFrTOHsg40PK7PUbE4ZAXP9ZCMFh2Jtn2brGq2uTuHUViG2UytuUrQLssRNrYLouz70cODPZCVQhbodL';
const MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY;

// --- Encryption Helper (Same as backend) ---
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  if (!MASTER_KEY) throw new Error('ENCRYPTION_MASTER_KEY is not set');
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.scryptSync(MASTER_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log(`Encrypting token for Tenant: ${TENANT_ID}...`);
    const accessTokenValue = encrypt(ACCESS_TOKEN);

    console.log(`Upserting WhatsApp Configuration...`);
    // Using 'any' cast because TS might complain about the generated types in a script context
    const result = await (prisma as any).whatsAppNumber.upsert({
      where: {
        phoneNumberId: PHONE_NUMBER_ID,
      },
      update: {
        wabaId: WABA_ID,
        accessToken: accessTokenValue,
        setupStatus: 'ACTIVE',
        isEnabled: true,
        updatedAt: new Date(),
      },
      create: {
        tenantId: TENANT_ID,
        phoneNumberId: PHONE_NUMBER_ID,
        phoneNumber: PHONE_NUMBER,
        wabaId: WABA_ID,
        purpose: 'DEFAULT',
        accessToken: accessTokenValue,
        setupStatus: 'ACTIVE',
        isEnabled: true,
        isDefault: true,
      },
    });

    console.log('✅ Configuration Saved Successfully!');
    console.log(result);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
