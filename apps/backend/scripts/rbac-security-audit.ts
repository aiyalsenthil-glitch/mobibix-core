
import axios from 'axios';

const BASE_URL = 'http://localhost_REPLACED:3000/api';
const FOREIGN_INVOICE_ID = 'ulv0zq5lng33fmj031q869km';
const FOREIGN_TENANT_ID = 'cmmf1d9rq0008levotuo1ydee';
const FOREIGN_SHOP_ID = 'cmmg5r5h50001leg4pwyge133';

async function runSecurityAudit() {
    console.log('🚀 Starting RBAC Security Audit (Isolation & Escalation)...');

    try {
        // 1. Login as a Staff Member (QA Technician who shouldn't have widespread access)
        console.log('\n--- Step 0: Login as Regular Staff ---');
        const loginRes = await axios.post(`${BASE_URL}/auth/login-qa`, {
            email: 'staff_qa_4@test.com' // TECHNICIAN
        });
        const { accessToken, user } = loginRes.data.data || loginRes.data;
        const headers = { Authorization: `Bearer ${accessToken}` };
        console.log(`Logged in as: ${user.email} (Role: TECHNICIAN)`);

        // 2. Cross Tenant Data Leak Test
        console.log('\n--- Step 1: Cross Tenant Data Leak Test ---');
        console.log(`Targeting Foreign Tenant: ${FOREIGN_TENANT_ID}`);
        try {
            // Note: Our controllers usually don't even take tenantId in query, but if they did:
            const res = await axios.get(`${BASE_URL}/mobileshop/sales/invoices?shopId=${FOREIGN_SHOP_ID}`, { headers });
            console.log('❌ FAIL: Accessed foreign shop invoices! Status:', res.status);
        } catch (err: any) {
            console.log(`✅ PASS: Access denied. Status: ${err.response?.status} (${err.response?.data?.message || err.message})`);
        }

        // 3. IDOR (Direct Object Reference)
        console.log('\n--- Step 2: IDOR (Accessing foreign invoice ID) ---');
        console.log(`Targeting Foreign Invoice: ${FOREIGN_INVOICE_ID}`);
        try {
            const res = await axios.get(`${BASE_URL}/mobileshop/sales/invoice/${FOREIGN_INVOICE_ID}`, { headers });
            console.log('❌ FAIL: Accessed foreign invoice data! Data:', JSON.stringify(res.data).substring(0, 50));
        } catch (err: any) {
            console.log(`✅ PASS: Access denied. Status: ${err.response?.status} (${err.response?.data?.message || err.message})`);
        }

        // 4. Role Escalation Test
        console.log('\n--- Step 3: Role Escalation Test ---');
        console.log('Trying to assign OWNER role to self (hypothetical endpoint /permissions/roles/assign or similar)');
        // Let's try the Staff creation/update endpoint which should be protected
        try {
             const res = await axios.post(`${BASE_URL}/staff`, {
                 email: 'hacker@test.com',
                 role: 'OWNER',
                 shopId: FOREIGN_SHOP_ID
             }, { headers });
             console.log('❌ FAIL: Staff was able to call staff creation! Status:', res.status);
        } catch (err: any) {
            console.log(`✅ PASS: Escalation blocked. Status: ${err.response?.status} (${err.response?.data?.message || err.message})`);
        }

    } catch (err: any) {
        console.error('Fatal Error during security audit:', err.response?.data || err.message);
    }
}

runSecurityAudit();
