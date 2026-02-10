const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost_REPLACED:3000/api';
const JWT_SECRET = '66941d80cb4102851452f736c33c6ba310de06b80f70f47aeb4c8d97a2eac6edd3de8f7c4185066a70522cc74cbe68e9'; 

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:m5gztfER4UP2TVgD@db.kpskhmjqvuncrtgthsxf.supabase.co:5432/postgres' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verifyOnboardingAPIs() {
  console.log('🚀 Starting Robust Onboarding API Verification...\n');

  try {
    // 0. Check Health
    console.log('🏥 Checking API Health...');
    try {
        await axios.get(`${API_URL.replace('/api', '')}/health`); 
        console.log('✅ /health is reachable');
    } catch (e) {
        console.log('⚠️ /health check failed (might be behind auth or incorrect path)', e.message);
    }

    // 1. Setup Test Data
    console.log('\n🛠️  Setting up Test User & Tenant...');
    const tenantId = 'test-tenant-onboarding';
    const userId = 'test-user-onboarding';
    
    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: { id: tenantId, name: 'Test Onboarding Tenant', code: 'TESTONB', tenantType: 'INDIVIDUAL' },
    });

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: 'test@onboarding.com', fullName: 'Test Onboarding', role: 'OWNER', REMOVED_AUTH_PROVIDERUid: 'test-uid-onboarding', tenantId: tenantId },
    });

    await prisma.userTenant.upsert({
        where: { userId_tenantId: { userId, tenantId } },
        update: { role: 'OWNER' },
        create: { userId, tenantId, role: 'OWNER' }
    });
    console.log('✅ Test Data Ready');

    // 2. Generate Token
    const token = jwt.sign({ sub: userId, email: user.email, role: 'OWNER', tenantId: tenantId }, JWT_SECRET, { expiresIn: '1h' });
    const headers = { Authorization: `Bearer ${token}` };

    // 2.5 Ensure Plan Exists
    console.log('\n🛠️  Ensuring Plan Exists...');
    const planCode = 'WHATSAPP_CRM_MONTHLY';
    let plan = await prisma.plan.findFirst({ where: { module: 'WHATSAPP_CRM' } });
    if (!plan) {
        console.log('⚠️ No WHATSAPP_CRM plan found. Creating one...');
        plan = await prisma.plan.create({
            data: {
                name: 'WhatsApp CRM Add-on',
                code: planCode,
                description: 'WhatsApp CRM features',
                price: 999,
                interval: 'MONTHLY',
                module: 'WHATSAPP_CRM',
                features: {},
                limits: {},
                isActive: true
            }
        });
        console.log('✅ Created Plan:', plan.id);
    } else {
        console.log('✅ Found existing plan:', plan.name);
    }

    // 3. Fetch Available Plans
    console.log('\n📋 [TEST 1] Fetching WhatsApp CRM Plan...');
    try {
      const planRes = await axios.get(`${API_URL}/plans/available?module=WHATSAPP_CRM`, { headers });
      console.log('✅ SUCCESS: Plan Response:', JSON.stringify(planRes.data, null, 2));
    } catch (error) {
      console.error('❌ FAIL: Failed to fetch plan:', error.response?.data || error.message);
    }

    // 4. Test Connect Endpoint (Expect 403 - Not Subscribed)
    console.log('\n🔗 [TEST 2] Testing Connect Endpoint (Unsubscribed)...');
    try {
        // Ensure no active subscription
        await prisma.tenantSubscription.deleteMany({ where: { tenantId, module: 'WHATSAPP_CRM' }});
        
        await axios.get(`${API_URL}/integrations/whatsapp/connect`, { headers });
        console.error('❌ FAIL: Should have been blocked!');
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 400) {
        console.log(`✅ SUCCESS: Correctly blocked with ${error.response.status}`);
      } else {
        console.error('❌ FAIL: Unexpected error:', error.response?.status, error.response?.data, error.message);
      }
    }

    // 5. Subscribe User
    console.log('\n💳 [TEST 3] Simulating Subscription...');
    await prisma.tenantSubscription.upsert({
      where: { tenantId_module: { tenantId, module: 'WHATSAPP_CRM' } },
      update: { status: 'ACTIVE', endDate: new Date(Date.now() + 86400000) },
      create: { tenantId, planId: plan.id, module: 'WHATSAPP_CRM', status: 'ACTIVE', billingCycle: 'MONTHLY', startDate: new Date(), endDate: new Date(Date.now() + 86400000) }
    });
    console.log('✅ Subscription Activated in DB');

    // 6. Test Connect Endpoint (Expect Success)
    console.log('\n🔗 [TEST 4] Testing Connect Endpoint (Subscribed)...');
    try {
      const connectRes = await axios.get(`${API_URL}/integrations/whatsapp/connect`, { headers });
      console.log('✅ SUCCESS: Connect URL generated:', connectRes.data.url?.substring(0, 50) + '...');
    } catch (error) {
      console.error('❌ FAIL: Failed to generate connect URL:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('\n❌ Verification Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyOnboardingAPIs();
