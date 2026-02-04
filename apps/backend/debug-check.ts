
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔍 Checking LATEST reminder (Any Status)...');

  const reminder = await prisma.customerReminder.findFirst({
    where: {
        channel: 'WHATSAPP',
        // status: 'FAILED' // Check ANY status
    },
    orderBy: { createdAt: 'desc' },
    include: {
        tenant: true,
        customer: true
    }
  });

  if (!reminder) {
    console.log('✅ No reminders found.');
    return;
  }

  console.log('❌ Found FAILED Reminder:');
  console.log(`- ID: ${reminder.id}`);
  console.log(`- TriggerType: ${reminder.triggerType}`);
  console.log(`- TriggerValue (Entity ID): ${reminder.triggerValue}`);
  console.log(`- TemplateKey: ${reminder.templateKey}`);
  console.log(`- FailureReason: ${reminder.failureReason}`);
  console.log(`- CreatedAt: ${reminder.createdAt}`);

  // Check the Entity (Invoice or JobCard)
  if (reminder.triggerValue) {
      console.log('\n🔎 Inspecting Entity (TriggerValue)...');
      
      const invoice = await prisma.invoice.findUnique({ where: { id: reminder.triggerValue } });
      if (invoice) {
          console.log(`✅ Found INVOICE:`);
          console.log(`  - ID: ${invoice.id}`);
          console.log(`  - CustomerName: '${invoice.customerName}'`);
          console.log(`  - TotalAmount: ${invoice.totalAmount}`);
          console.log(`  - InvoiceNumber: ${invoice.invoiceNumber}`);
      } else {
          console.log(`⚠️  Entity not found as INVOICE.`);
      }

      const jobCard = await prisma.jobCard.findUnique({ where: { id: reminder.triggerValue } });
      if (jobCard) {
          console.log(`✅ Found JOB CARD:`);
          console.log(`  - ID: ${jobCard.id}`);
          console.log(`  - CustomerName: '${jobCard.customerName}'`);
          console.log(`  - JobNumber: ${jobCard.jobNumber}`);
      } else {
          console.log(`⚠️  Entity not found as JOB CARD.`);
      }
  }

  console.log('\n🤖 Automation Check (Service Simulation):');
  const automation = await prisma.whatsAppAutomation.findFirst({
      where: { 
          templateKey: reminder.templateKey,
          enabled: true
      }
  });
  
  let simulatedModule = 'GYM (Default)';
  if (reminder.tenant?.tenantType?.toUpperCase() === 'MOBILE_SHOP') simulatedModule = 'MOBILE_SHOP';
  if (reminder.tenant?.tenantType?.toUpperCase() === 'MOBILE_REPAIR') simulatedModule = 'MOBILE_REPAIR';

  console.log(`- Base Context Module: ${simulatedModule}`);

  if (automation) {
      console.log(`- ✅ Found Automation (Enabled=true):`);
      console.log(`  - ModuleType: ${automation.moduleType}`);
      console.log(`  - EventType: ${automation.eventType}`);
      
      if (automation.moduleType === 'MOBILE_SHOP') simulatedModule = 'MOBILE_SHOP (Automation Override)';
      if (automation.moduleType === 'GYM') simulatedModule = 'GYM (Automation Override)';
      // Note: MOBILE_REPAIR override was added recently, checking raw value
      if ((automation.moduleType as any) === 'MOBILE_REPAIR') simulatedModule = 'MOBILE_REPAIR (Automation Override)';
      
  } else {
      console.log(`- ⚠️ No ENABLED Automation found for template '${reminder.templateKey}'`);
  }
  
  console.log(`- FINAL DETECTED MODULE: ${simulatedModule}`);

  // Check Variables
  if (simulatedModule.includes('GYM')) {
      console.log('🚨 FAIL: Module is GYM. Variables like customerName will fail.');
  } else {
      console.log('✅ PASS: Module is Correct.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
