import { PrismaClient } from '@prisma/client';
import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

const prisma = new PrismaClient();

async function main() {
  const parties = await prisma.party.findMany({
    where: {
      normalizedPhone: "", // Mandatory field, so only searching for empty strings now
    },
  });

  console.log(`Found ${parties.length} parties to normalize.`);

  let successCount = 0;
  let failCount = 0;

  for (const party of parties) {
    try {
      // Use existing countryCode or default to 'IN'
      const country = (party as any).countryCode || 'IN';
      
      if (isValidPhoneNumber(party.phone, country as CountryCode)) {
        const normalized = parsePhoneNumber(party.phone, country as CountryCode).format('E.164');
        
        await prisma.party.update({
          where: { id: party.id },
          data: {
            normalizedPhone: normalized,
            countryCode: country,
          },
        });
        successCount++;
      } else {
        console.warn(`[SKIP] Invalid phone format for Party ID ${party.id}: ${party.phone}`);
        failCount++;
      }
    } catch (error: any) {
      console.error(`[ERROR] Party ID ${party.id}: ${error.message}`);
      failCount++;
    }
  }

  console.log('--- Migration Summary ---');
  console.log(`Successfully normalized: ${successCount}`);
  console.log(`Skipped/Failed: ${failCount}`);
  console.log('-------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
