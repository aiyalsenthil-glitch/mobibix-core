
const axios = require('axios');
const jwt = require('jsonwebtoken'); // Assuming jsonwebtoken is available via nestjs/jwt dependency
require('dotenv').config();

const BASE_URL = 'http://localhost_REPLACED:3001/api';

const JWT_SECRET = process.env.JWT_SECRET;

async function runTest() {
  try {
    // 1. MANUALLY SIGN TOKEN (Bypass Firebase)
    console.log('Generating JWT for test user...');
    
    // Payload matching AuthService.loginWithFirebase structure
    const userPayload = {
      sub: 'test-owner-cancellation', // User ID
      tenantId: 'test-tenant-cancellation',
      userTenantId: null, // We might need to fetch this if critical, but let's try without or fetch it first if needed.
                          // Actually, AuthService puts userTenantId in token. 
                          // Let's fetch the exact userTenantId to be safe.
      role: 'OWNER',
      planCode: 'TRIAL'
    };

    // Need to fetch userTenantId? 
    // Let's rely on a helper or just quick query if needed. 
    // For now, let's try without userTenantId or use a placeholder if the backend doesn't strictly validate it for *all* endpoints.
    // Wait, typical guard extracts tenantId from user. 
    // Let's try to do a quick DB lookup to get the real userTenantId for correctness.
    
    const { PrismaClient } = require('@prisma/client');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    
    const userTenant = await prisma.userTenant.findUnique({
        where: {
            userId_tenantId: {
                userId: 'test-owner-cancellation',
                tenantId: 'test-tenant-cancellation'
            }
        }
    });
    
    await prisma.$disconnect();
    await pool.end();

    if (!userTenant) throw new Error("UserTenant not found for token generation");

    userPayload.userTenantId = userTenant.id;

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' });
    const shopId = 'test-shop-cancellation';
    const headers = { Authorization: `Bearer ${token}` };

    console.log(`Extensions: Shop ID ${shopId}`);

    // 2. CREATE JOB CARD
    console.log('Creating Job Card...');
    const jobRes = await axios.post(
      `${BASE_URL}/mobileshop/shops/${shopId}/job-cards`,
      {
        customerName: 'Test Risk Mitigation',
        customerPhone: '9999999999',
        deviceType: 'Mobile',
        deviceBrand: 'Samsung',
        deviceModel: 'Test Device',
        customerComplaint: 'Testing Cancellation',
        estimatedCost: 1000,
        advancePaid: 500, // 💰 ADVANCE PAID
      },
      { headers }
    );

    const jobId = jobRes.data.id;
    console.log(`Job Created: ${jobId}, Advance: ${jobRes.data.advancePaid}`);

    // 2a. CREATE PRODUCT
    console.log('Creating Product...');
    const productRes = await axios.post(
        `${BASE_URL}/mobileshop/inventory/product`,
        {
            name: 'Test Part ' + Date.now(), // Unique name
            type: 'GOODS',
            shopId: shopId,
            salePrice: 500,
            costPrice: 200,
            gstRate: 0,
            isSerialized: false
        },
        { headers }
    );
    const productId = productRes.data.id;
    console.log(`Product Created: ${productId}`);

    // 2b. ADD STOCK
    console.log('Adding Stock...');
    await axios.post(
        `${BASE_URL}/mobileshop/inventory/stock-in`,
        {
            productId: productId,
            quantity: 10,
            costPerUnit: 200
        },
        { headers }
    );
    console.log('Stock Added: 10 qty');

    // 2c. ADD PART TO JOB CARD
    console.log('Adding Part to Job Card...');
    await axios.post(
        `${BASE_URL}/mobileshop/shops/${shopId}/job-cards/${jobId}/parts`,
        {
            productId: productId,
            quantity: 2
        },
        { headers }
    );
    console.log('Part Added: 2 qty');

    // 2c. VERIFY STOCK DEDUCTION
    const productAfterAdd = await axios.get(
        `${BASE_URL}/mobileshop/products/${productId}?shopId=${shopId}`,
        { headers }
    );
    console.log('Stock after Add Part:', productAfterAdd.data.stockQty);

    if (productAfterAdd.data.stockQty !== 8) {
        throw new Error(`Stock deduction failed! Expected 8, got ${productAfterAdd.data.stockQty}`);
    }

    // 3. CANCEL JOB CARD (With Refund)
    console.log('\n--- 3. Testing Cancellation ---');
    
    // 3a. Try Cancel without refund (Should Fail)
    try {
        await axios.patch(
            `${BASE_URL}/mobileshop/shops/${shopId}/job-cards/${jobId}/status`,
            { status: 'CANCELLED', reason: 'Test' },
            { headers }
        );
        throw new Error('Cancellation should have failed without refund!');
    } catch (e) {
        console.log('✅ Success: Cancellation blocked as expected.', e.response?.data?.message);
    }

    // 3b. Cancel with Refund
    const cancelRes = await axios.patch(
        `${BASE_URL}/mobileshop/shops/${shopId}/job-cards/${jobId}/status`,
        { 
            status: 'CANCELLED', 
            reason: 'Test',
            refundDetails: {
                amount: 500,
                mode: 'CASH'
            }
        },
        { headers }
    );
    console.log('Job Cancelled:', cancelRes.data.status);

    // 4. VERIFY RECONCILIATION
    console.log('\n--- 4. Verifying Reconciliation ---');

    // 4a. Verify Stock Restored
    const productAfterCancel = await axios.get(
        `${BASE_URL}/mobileshop/products/${productId}?shopId=${shopId}`,
        { headers }
    );
    console.log('Stock after Cancel:', productAfterCancel.data.stockQty);

    if (productAfterCancel.data.stockQty !== 10) {
        throw new Error(`Stock restoration failed! Expected 10, got ${productAfterCancel.data.stockQty}`);
    }

    console.log('🎉 Test Complete!');

  } catch (error) {
    console.error('Test Failed (Full Object):', error);
    if (typeof error === 'object' && error !== null) {
        console.error('Error keys:', Object.keys(error));
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
  }
}

runTest();
