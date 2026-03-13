
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost_REPLACED:3000/api',
  validateStatus: () => true, // Don't throw on 4xx/5xx
});

async function runTest() {
  console.log('🚀 Starting RBAC Flow Test...');

  // 1. Login as Owner
  console.log('--- Logging in as OWNER ---');
  const loginRes = await api.post('/auth/login-qa', {
    email: 'test@gmail.com',
    password: 'Test@123',
  });

  if (loginRes.status !== 200) {
    console.error('❌ Login failed:', loginRes.status, loginRes.data);
    return;
  }

  const ownerToken = loginRes.data.accessToken;
  const tenantId = loginRes.data.user.tenantId;
  console.log(`✅ Logged in. Tenant ID: ${tenantId}`);

  const ownerHeaders = { Authorization: `Bearer ${ownerToken}` };

  // 2. Test Foundation Endpoints (Usage History, Roles)
  console.log('\n--- Testing Owner Access to CORE/SYSTEM ---');
  
  const usageRes = await api.get('/tenant/usage-history?days=30', { headers: ownerHeaders });
  console.log(`Usage History: ${usageRes.status === 200 ? '✅ 200' : '❌ ' + usageRes.status}`);
  if (usageRes.status !== 200) console.log('Error Data:', usageRes.data);

  const rolesRes = await api.get('/permissions/roles', { headers: ownerHeaders });
  console.log(`List Roles: ${rolesRes.status === 200 ? '✅ 200' : '❌ ' + rolesRes.status}`);

  const matrixRes = await api.get('/permissions/roles/matrix', { headers: ownerHeaders });
  console.log(`Permission Matrix: ${matrixRes.status === 200 ? '✅ 200' : '❌ ' + matrixRes.status}`);

  // 3. Create a Staff Role
  console.log('\n--- Creating "Sales Executive" Role ---');
  const createRoleRes = await api.post('/permissions/roles', {
    name: 'Repro Role ' + Date.now(),
    description: 'Test role for repo',
    permissions: ['mobile_shop.sales.view'] // Using base permission with module prefix
  }, { headers: ownerHeaders });

  if (createRoleRes.status !== 201) {
    console.error('❌ Role creation failed:', createRoleRes.status, createRoleRes.data);
    return;
  }
  const roleId = createRoleRes.data.id;
  console.log(`✅ Role created: ${roleId}`);

  // 4. Create/Invite Staff
  // Note: I'll use a direct user-tenant creation if possible, or join existing staff account
  // For the repro, I'll check if 'staff1@gmail.com' exists and assign the role
  const staffEmail = 'staff_test_repro@gmail.com';
  console.log(`\n--- Setting up Staff: ${staffEmail} ---`);
  
  // Create user if not exists via script or just use existing "staff1@gmail.com"
  // I'll use a script to ensure the user exists and is linked
  
  // 5. Login as Staff
  console.log('\n--- Logging in as STAFF ---');
  const staffLoginRes = await api.post('/auth/login-qa', {
    email: 'staff1@gmail.com', // Assuming staff1 exists based on AuthService logic
  });
  
  if (staffLoginRes.status !== 200) {
      // Try to create it first if it doesn't exist?
      // Actually, I'll just skip the staff login for now and focus on why OWNER gets 403
      console.log('⚠️ staff1@gmail.com login failed (maybe not in DB). Focusing on OWNER check.');
  } else {
      const staffToken = staffLoginRes.data.accessToken;
      const staffHeaders = { Authorization: `Bearer ${staffToken}` };
      
      const staffUsageRes = await api.get('/tenant/usage-history?days=30', { headers: staffHeaders });
      console.log(`Staff Usage History access (Should be 403): ${staffUsageRes.status === 403 ? '✅ 403 Correct' : '❌ ' + staffUsageRes.status}`);
  }

  console.log('\n🏁 Test finished.');
}

runTest();
