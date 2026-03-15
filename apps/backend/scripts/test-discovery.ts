import axios from 'axios';

const BASE_URL = 'http://localhost_REPLACED:3000/api';

async function testDiscovery() {
  try {
    console.log('--- Step 1: Login ---');
    const loginRes = await axios.post(`${BASE_URL}/auth/login-qa`, {
      email: 'test@gmail.com',
      password: 'test@123'
    });
    
    const { accessToken, user } = loginRes.data;
    const tenantId = user.tenantId;
    console.log(`Logged in. TenantID: ${tenantId}`);

    const headers = { Authorization: `Bearer ${accessToken}` };

    console.log('\n--- Step 2: Discover Role Templates ---');
    const templatesRes = await axios.get(`${BASE_URL}/permissions/roles/templates`, { headers });
    console.log(`Found ${templatesRes.data.length} templates.`);
    console.log(JSON.stringify(templatesRes.data, null, 2));
    if (Array.isArray(templatesRes.data)) {
        templatesRes.data.forEach((t: any) => {
            console.log(`- ${t.name} (${t.isSystem ? 'System' : 'Custom'})`);
        });
    }

    console.log('\n--- Step 3: Discover Modules ---');
    const modulesRes = await axios.get(`${BASE_URL}/permissions/roles/modules`, { headers });
    console.log(`Found ${modulesRes.data.length} modules.`);
    console.log(JSON.stringify(modulesRes.data, null, 2));
    modulesRes.data.forEach((m: any) => {
        console.log(`- ${m.moduleType}: ${m.resources.length} resources`);
    });

  } catch (err: any) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testDiscovery();
