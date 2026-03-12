import { PrismaClient, PartType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const csvFilePath = path.join(__dirname, '../../compatibility_data.csv');
  
  if (!fs.existsSync(csvFilePath)) {
    console.log('No compatibility_data.csv found. Creating a sample one.');
    const sampleData = `group_name,part_type,phone_model
TG-SAM-A50,TEMPERED_GLASS,Samsung A50
TG-SAM-A50,TEMPERED_GLASS,Samsung A50S
TG-SAM-A50,TEMPERED_GLASS,Samsung M31
TG-SAM-A50,TEMPERED_GLASS,Samsung M21
DISP-SAM-A50,DISPLAY,Samsung A50
DISP-SAM-A50,DISPLAY,Samsung A50S
BATT-SAM-A50,BATTERY,Samsung A50
`;
    fs.writeFileSync(csvFilePath, sampleData);
  }

  const content = fs.readFileSync(csvFilePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('group_name'));

  console.log(`Processing ${lines.length} compatibility records...`);

  for (const line of lines) {
    const [groupName, partType, phoneModelStr] = line.split(',').map(s => s.trim());
    
    if (!groupName || !partType || !phoneModelStr) continue;

    // 1. Handle Brand and Phone Model
    const spaceIndex = phoneModelStr.indexOf(' ');
    let brandName = 'Other';
    let modelName = phoneModelStr;

    if (spaceIndex !== -1) {
      brandName = phoneModelStr.substring(0, spaceIndex);
      modelName = phoneModelStr.substring(spaceIndex + 1);
    }

    const brand = await prisma.brand.upsert({
      where: { name: brandName },
      update: {},
      create: { name: brandName },
    });

    const phoneModel = await prisma.phoneModel.upsert({
      where: {
        brandId_modelName: {
          brandId: brand.id,
          modelName: modelName,
        },
      },
      update: {},
      create: {
        brandId: brand.id,
        modelName: modelName,
      },
    });

    // 2. Handle Compatibility Group
    const group = await prisma.compatibilityGroup.upsert({
      where: { name: groupName },
      update: { partType: partType as PartType },
      create: {
        name: groupName,
        partType: partType as PartType,
      },
    });

    // 3. Link Phone to Group
    await prisma.compatibilityGroupPhone.upsert({
      where: {
        groupId_phoneModelId: {
          groupId: group.id,
          phoneModelId: phoneModel.id,
        },
      },
      update: {},
      create: {
        groupId: group.id,
        phoneModelId: phoneModel.id,
      },
    });

    console.log(`Linked ${phoneModelStr} to ${groupName}`);
  }

  console.log('Seed completed successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
