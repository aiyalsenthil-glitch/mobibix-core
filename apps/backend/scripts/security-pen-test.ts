import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const BASE_URL = 'http://localhost_REPLACED:3000';
const JWT_SECRET = process.env.JWT_SECRET || '';

// Test Data from discovery
const USER_A_ID = '02377191-3353-4da1-90f8-98519ad8776b';
const TENANT_A_ID = 'cmma9ernt0000j1s4x8qwuy5y';

const USER_B_ID = '5249a9b1-0681-4cb4-8cd6-7f9d8c16606a';
const TENANT_B_ID = 'cmma9erwa0001j1s4d8pcn1ro';
const RESOURCE_B_ID = 'cmma9es480005j1s4o1cvqap4'; // UserTenant for Tenant B

async function runPenTest() {
  let log = '--- SaaS Security Penetration Test Results ---\n';

  // 1. Generate JWT for User A
  const tokenA = jwt.sign({
    sub: USER_A_ID,
    tenantId: TENANT_A_ID,
    role: 'OWNER'
  }, JWT_SECRET);

  log += 'Token A generated.\n';

  // 2. Test Cross-Tenant Access (IDOR)
  log += '\n[TEST 1] Attempting Cross-Tenant Access (IDOR)...\n';
  try {
    const meRes = await axios.get(`${BASE_URL}/api/me`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    log += `Successfully reached /api/me: User ${meRes.data.id} in Tenant ${meRes.data.tenantId}\n`;

    log += `Requesting Tenant B resource: ${RESOURCE_B_ID} using Tenant A token...\n`;
    const idorRes = await axios.get(`${BASE_URL}/api/user-tenants/${RESOURCE_B_ID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      validateStatus: () => true
    });
    
    if (idorRes.status === 404 || idorRes.status === 403) {
      log += `✅ SECURITY PASS: Request blocked with status ${idorRes.status}\n`;
    } else if (idorRes.status === 200) {
      log += '❌ SECURITY HOLE: Successfully accessed Tenant B data!\n';
    } else {
      log += `❓ UNEXPECTED STATUS: ${idorRes.status}\n`;
    }
  } catch (err: any) {
    log += `Error during TEST 1: ${err.message}\n`;
  }

  // 3. Test RBAC Bypass
  log += '\n[TEST 2] Attempting RBAC Privilege Escalation...\n';
  const staffToken = jwt.sign({
    sub: USER_A_ID,
    tenantId: TENANT_A_ID,
    role: 'STAFF'
  }, JWT_SECRET);

  try {
    log += 'Requesting OWNER-only endpoint /api/staff/invite with STAFF role...\n';
    const rbacRes = await axios.post(`${BASE_URL}/api/staff/invite`, {
      email: 'hacker@example.com'
    }, {
      headers: { Authorization: `Bearer ${staffToken}` },
      validateStatus: () => true
    });

    if (rbacRes.status === 403) {
      log += `✅ SECURITY PASS: Unauthorized role blocked with status 403\n`;
    } else if (rbacRes.status === 201 || rbacRes.status === 200) {
      log += '❌ SECURITY HOLE: Successfully accessed OWNER endpoint as STAFF!\n';
    } else {
      log += `❓ UNEXPECTED STATUS (might be 404 if route changed): ${rbacRes.status}\n`;
    }
  } catch (err: any) {
    log += `Error during TEST 2: ${err.message}\n`;
  }

  // 3. Test: STAFF can access GET /api/users (exposes OWNER's contact info)
  log += '\n[TEST 3] Checking if STAFF can enumerate all users via GET /api/users...\n';
  try {
    const staffToken = jwt.sign({
      sub: USER_A_ID,
      tenantId: TENANT_A_ID,
      role: 'STAFF'
    }, JWT_SECRET);

    const usersRes = await axios.get(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${staffToken}` },
      validateStatus: () => true
    });

    if (usersRes.status === 403) {
      log += `✅ SECURITY PASS: STAFF blocked from /api/users with 403\n`;
    } else if (usersRes.status === 200) {
      const users = usersRes.data;
      log += `❌ SECURITY CONCERN: STAFF can list ${Array.isArray(users) ? users.length : '?'} users via GET /api/users\n`;
      log += `   Exposed fields include: email, phone, fullName\n`;
      log += `   This allows STAFF to see OWNER contact details.\n`;
    } else {
      log += `❓ UNEXPECTED STATUS: ${usersRes.status}\n`;
    }
  } catch (err: any) {
    log += `Error during TEST 3: ${err.message}\n`;
  }

  // 4. Test: STAFF calling OWNER-only endpoint PATCH /gym/members/:id/owner-edit
  log += '\n[TEST 4] STAFF attempting restricted PATCH /api/gym/members/:id/owner-edit...\n';
  try {
    const staffToken = jwt.sign({
      sub: USER_A_ID,
      tenantId: TENANT_A_ID,
      role: 'STAFF'
    }, JWT_SECRET);

    const editRes = await axios.patch(
      `${BASE_URL}/api/gym/members/someRandomId/owner-edit`,
      { fullName: 'Hacked Name' },
      {
        headers: { Authorization: `Bearer ${staffToken}` },
        validateStatus: () => true
      }
    );

    if (editRes.status === 403) {
      log += `✅ SECURITY PASS: STAFF blocked from owner-edit with 403\n`;
    } else {
      log += `⚠️  UNEXPECTED STATUS: ${editRes.status} (might be 404 if member doesn't exist)\n`;
      if (editRes.data) log += `   Response: ${JSON.stringify(editRes.data)}\n`;
    }
  } catch (err: any) {
    log += `Error during TEST 4: ${err.message}\n`;
  }

  fs.writeFileSync('pen-test-results.txt', log);
  console.log('Pen test completed. Results saved to pen-test-results.txt');
}

runPenTest().catch(console.error);
