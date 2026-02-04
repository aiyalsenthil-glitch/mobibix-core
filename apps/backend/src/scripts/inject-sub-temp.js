
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'cml7mgvuy00008klefqqqoczl';
  const planId = '3255c62c-8aee-42be-a312-5cc3d15d8900';
  
  // We need to inject a subscription for WHATSAPP_CRM to pass the billing check.
  // The service checks: getCurrentActiveSubscription(tenantId, ModuleType.WHATSAPP_CRM)
  
  console.log(`Injecting WHATSAPP_CRM subscription for tenant ${tenantId}...`);

  // 1. Create/Upsert the subscription
  const subscription = await prisma.tenantSubscription.upsert({
    where: {
      tenantId_module: {
        tenantId: tenantId,
        module: 'WHATSAPP_CRM', // Must match ModuleType enum
      },
    },
    update: {
        status: 'ACTIVE',
        planId: planId,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year validity
        autoRenew: true,
    },
    create: {
      tenantId: tenantId,
      planId: planId,
      module: 'WHATSAPP_CRM',
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year validity
      autoRenew: true,
    },
  });

  console.log('Subscription injected:', subscription);

  // 2. Also ensure the Tenant has whatsappCrmEnabled = true
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { 
        whatsappCrmEnabled: true,
        whatsappPhoneNumberId: '100609346426084', // Dummy ID if not present
        // Ensure tenantType is MOBILE_SHOP for our demo UI logic
        tenantType: 'MOBILE_SHOP' 
    },
  });
  
  console.log('Tenant updated:', tenant);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
