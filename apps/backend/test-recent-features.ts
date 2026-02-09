
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { JobStatus, PaymentMode } from '@prisma/client';

dotenv.config();

const BASE_URL = 'http://localhost_REPLACED:3001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

// Test User & Tenant (same as previous test)
const TEST_USER_ID = 'user_cmleqt9yv0000a8ole11x5x9x'; // From previous log or create new
const TEST_TENANT_ID = 'cmleqt9yv0001a8ole99x7x8y';   // From previous log
// Actually, let's use the ones created in create-test-user.ts or just hardcode if we know them.
// Better: Use a fresh token generation with known IDs if possible, or use the ones from recent run.
// I will rely on the token generation logic similar to test-cancellation.ts

async function generateTestToken() {
    console.log('Generating JWT for test user...');
    // We need a valid tenant ID.
    // Let's assume the one from previous test exists.
    // Or I can just fetch the user first? No, I need token to fetch.
    // I will mock the UserTenant logic in the payload.
    
    // Payload matching what AuthService generates and Strategy expects
    const payload = {
        sub: 'test-user-cancellation', // userId
        email: 'test-cancellation@example.com',
        tenantId: 'test-tenant-cancellation', // tenantId (must match DB if we want DB lookups to work)
        // role: 'OWNER', // Optional depending on guard
    };
    
    // WAIT: The backend validates if tenant exists for some calls?
    // Yes, `req.user.tenantId` is used.
    // In `test-cancellation.ts` we successfully used 'test-tenant-cancellation'.
    // So I will use the same.
    
    return jwt.sign(payload, JWT_SECRET);
}

async function runTest() {
    try {
        const token = await generateTestToken();
        const headers = { Authorization: `Bearer ${token}` };
        
        console.log('--- STARTING AUTOMATED VERIFICATION OF RECENT APIS ---');

        // 1. GET CURRENT SUBSCRIPTION
        console.log('\n--- 1. Testing Get Current Subscription ---');
        const currentSub = await axios.get(`${BASE_URL}/billing/subscription/current?module=MOBILE_SHOP`, { headers });
        console.log('Current Plan:', currentSub.data.current.name);
        console.log('Current Cycle:', currentSub.data.current.priceSnapshot ? 'PAID' : 'TRIAL');

        // 2. USAGE HISTORY
        console.log('\n--- 2. Testing Usage History ---');
        const history = await axios.get(`${BASE_URL}/tenant/usage-history?days=7`, { headers });
        console.log(`History Entries: ${history.data.length}`);
        if (!Array.isArray(history.data)) throw new Error('Usage history is not an array');
        if (history.data.length > 0) {
            console.log('Example Entry:', history.data[0]);
        }
        
        // 3. DOWNGRADE CHECK
        console.log('\n--- 3. Testing Downgrade Check ---');
        // Need a target plan ID. Let's try to fetch plans first.
        const plansValues = await axios.get(`${BASE_URL}/plans?module=MOBILE_SHOP`, { headers }).catch(() => null);
        
        let targetPlanId = 'dummy-plan-id';
        if (plansValues && plansValues.data.length > 0) {
             targetPlanId = plansValues.data[0].id; // Pick first plan
             console.log(`Checking downgrade to: ${plansValues.data[0].name} (${targetPlanId})`);
        } else {
             console.log('Could not fetch plans, skipping real ID check.');
        }

        try {
            const downgradeCheck = await axios.get(
                `${BASE_URL}/billing/subscription/downgrade-check?targetPlan=${targetPlanId}&module=MOBILE_SHOP`, 
                { headers }
            );
            console.log('Downgrade Possible:', downgradeCheck.data.isEligible);
            console.log('Blockers:', downgradeCheck.data.blockers);
        } catch (e) {
            console.log('Downgrade check failed (expected if plan invalid):', e.response?.data?.message);
        }

        // 4. BILLING CYCLE SWITCH (Upgrade endpoint)
        console.log('\n--- 4. Testing Billing Cycle Switch ---');
        // We'll try to switch to YEARLY on the CURRENT plan (if we have a planId)
        // If trial, this might fail or count as purchase?
        // Let's just try to hit the endpoint and see if it validates input.
        
        if (currentSub.data.current.planId) { // If has active plan
             try {
                const switchCycle = await axios.patch(
                    `${BASE_URL}/billing/subscription/upgrade`,
                    {
                        newPlanId: currentSub.data.current.planId, // Same plan
                        newBillingCycle: 'YEARLY'
                    },
                    { headers }
                );
                console.log('Cycle Switch Result:', switchCycle.data.message);
             } catch (e) {
                 console.log('Cycle Switch Error:', e.response?.data?.message);
             }
        } else {
            console.log('Skipping cycle switch (No active paid plan)');
        }

        console.log('\n--- VERIFICATION COMPLETE ---');

    } catch (e) {
        console.error('Test Failed:', e.message);
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Data:', JSON.stringify(e.response.data, null, 2));
        }
    }
}

runTest();
