import { PrismaClient, PartType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const csvFilePath = path.join(__dirname, '../../compatibility_data.csv');
  
  if (!fs.existsSync(csvFilePath)) {
    console.error('No compatibility_data.csv found.');
    return;
  }

  const content = fs.readFileSync(csvFilePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('group_name'));

  console.log(`Analyzing ${lines.length} compatibility records...`);

  const uniqueBrands = new Set<string>();
  const uniqueModels = new Map<string, string>(); // fullName -> brandName
  const uniqueGroups = new Map<string, string>(); // groupName -> partType
  const relations: { groupName: string; modelFullName: string }[] = [];

  for (const line of lines) {
    const [groupName, partType, phoneModelStr] = line.split(',').map(s => s.trim());
    if (!groupName || !partType || !phoneModelStr) continue;

    const spaceIndex = phoneModelStr.indexOf(' ');
    let brandName = 'Other';
    if (spaceIndex !== -1) {
      brandName = phoneModelStr.substring(0, spaceIndex);
    }

    uniqueBrands.add(brandName);
    uniqueModels.set(phoneModelStr, brandName);
    uniqueGroups.set(groupName, partType);
    relations.push({ groupName, modelFullName: phoneModelStr });
  }

  console.log(`Found ${uniqueBrands.size} brands, ${uniqueModels.size} models, and ${uniqueGroups.size} groups.`);

  const startTime = Date.now();

  // 1. Bulk Upsert Brands
  console.log('Seeding Brands...');
  for (const brandName of uniqueBrands) {
    await prisma.brand.upsert({
      where: { name: brandName },
      update: {},
      create: { name: brandName },
    });
  }

  const brandDict = new Map<string, string>();
  const allBrands = await prisma.brand.findMany();
  allBrands.forEach(b => brandDict.set(b.name, b.id));

  // 2. Bulk Upsert Models
  console.log('Seeding Models...');
  const modelEntries = Array.from(uniqueModels.entries());
  for (let i = 0; i < modelEntries.length; i += 50) {
      // Small batches for Models to avoid unique constraint race but still be faster
      const batch = modelEntries.slice(i, i + 50);
      await Promise.all(batch.map(async ([fullName, brandName]) => {
          const brandId = brandDict.get(brandName);
          if (!brandId) return;
          
          const modelName = brandName === 'Other' ? fullName : fullName.substring(brandName.length + 1);
          
          await prisma.phoneModel.upsert({
              where: { brandId_modelName: { brandId, modelName } },
              update: {},
              create: { brandId, modelName },
          });
      }));
      process.stdout.write(`\rModels: ${Math.min(i + 50, modelEntries.length)}/${modelEntries.length}`);
  }
  console.log('\nModels seeded.');

  const modelDict = new Map<string, string>();
  const allModels = await prisma.phoneModel.findMany({ include: { brand: true } });
  allModels.forEach(m => modelDict.set(`${m.brand.name} ${m.modelName}`, m.id));

  // 3. Bulk Upsert Groups
  console.log('Seeding Groups...');
  const groupEntries = Array.from(uniqueGroups.entries());
  for (let i = 0; i < groupEntries.length; i += 50) {
      const batch = groupEntries.slice(i, i + 50);
      await Promise.all(batch.map(async ([name, partType]) => {
          await prisma.compatibilityGroup.upsert({
              where: { name },
              update: { partType: partType as PartType },
              create: { name, partType: partType as PartType },
          });
      }));
      process.stdout.write(`\rGroups: ${Math.min(i + 50, groupEntries.length)}/${groupEntries.length}`);
  }
  console.log('\nGroups seeded.');

  const groupDict = new Map<string, string>();
  const allGroups = await prisma.compatibilityGroup.findMany();
  allGroups.forEach(g => groupDict.set(g.name, g.id));

  // 4. Bulk Insert Junctions (createMany with skipDuplicates)
  console.log('Seeding Junctions...');
  const junctionData = relations.map(rel => ({
      groupId: groupDict.get(rel.groupName)!,
      phoneModelId: modelDict.get(rel.modelFullName)!
  })).filter(j => j.groupId && j.phoneModelId);

  // Group by unique pairs to avoid createMany error if dataset has duplicates
  const uniqueJunctions = Array.from(new Set(junctionData.map(j => `${j.groupId}:${j.phoneModelId}`)))
    .map(key => {
        const [groupId, phoneModelId] = key.split(':');
        return { groupId, phoneModelId };
    });

  for (let i = 0; i < uniqueJunctions.length; i += 500) {
      const batch = uniqueJunctions.slice(i, i + 500);
      await prisma.compatibilityGroupPhone.createMany({
          data: batch,
          skipDuplicates: true
      });
      process.stdout.write(`\rJunctions: ${Math.min(i + 500, uniqueJunctions.length)}/${uniqueJunctions.length}`);
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\n\nSeed completed successfully in ${totalTime.toFixed(1)}s.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
