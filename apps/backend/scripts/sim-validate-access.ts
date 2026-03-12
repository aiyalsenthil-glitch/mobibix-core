import { PrismaClient, UserRole } from '@prisma/client';
const prisma = new PrismaClient();

async function simulateValidateShopAccess(userId: string, tenantId: string, shopId?: string) {
  console.log(`Checking for UserID: ${userId}, TenantID: ${tenantId}, ShopID: ${shopId}`);
  
  // Simulation of the controller logic
  const staffEntries = await prisma.shopStaff.findMany({
    where: { userId, tenantId, isActive: true, deletedAt: null },
    select: { shopId: true },
  });
  
  const authorizedShopIds = staffEntries.map(s => s.shopId);
  console.log('Authorized Shop IDs:', authorizedShopIds);
  
  if (shopId) {
    if (!authorizedShopIds.includes(shopId)) {
      console.log('FAILED: Not in authorized list');
    } else {
      console.log('SUCCESS: Authorized');
    }
  } else {
    if (authorizedShopIds.length > 0) {
      console.log('SUCCESS: Auto-picked', authorizedShopIds[0]);
    } else {
      console.log('FAILED: No authorized shops');
    }
  }
}

// Data from previous queries
const USER_ID = '46f3c5c7-35e9-4393-abaa-029059becf33';
const TENANT_ID = 'cmmf1d9rq0008levotuo1ydee';
const SHOP_ID = 'cmmf1dbed000slevoyvirr5h4';

simulateValidateShopAccess(USER_ID, TENANT_ID, SHOP_ID).catch(console.error);
simulateValidateShopAccess(USER_ID, TENANT_ID, undefined).catch(console.error);
