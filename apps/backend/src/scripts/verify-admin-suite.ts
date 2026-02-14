import axios from 'axios';

const API_URL = 'http://localhost_REPLACED:3000/api';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN;

async function verifyAdminSuite() {
  console.log('🧪 Starting Admin Suite Verification...');

  const headers = { Authorization: `Bearer ${JWT_TOKEN}` };

  try {
    // 1. Verify Global Analytics
    console.log('🚀 Testing GET /admin/analytics/global...');
    const statsRes = await axios.get(`${API_URL}/admin/analytics/global`, {
      headers,
    });
    console.log('✅ Global stats:', statsRes.data);

    if (
      typeof statsRes.data.mrr !== 'number' ||
      typeof statsRes.data.totalTenants !== 'number'
    ) {
      console.error('❌ Stats structure invalid!');
    }

    // 2. Verify HSN MDM
    console.log('🚀 Testing POST /admin/mdm/hsn...');
    const hsnRes = await axios.post(
      `${API_URL}/admin/mdm/hsn`,
      {
        code: 'TESTHSN',
        description: 'Test HSN Description',
        gstRate: '12',
      },
      { headers },
    );
    console.log('✅ HSN upserted:', hsnRes.data);

    const hsnList = await axios.get(`${API_URL}/admin/mdm/hsn?search=TESTHSN`, {
      headers,
    });
    if (hsnList.data.some((h: any) => h.code === 'TESTHSN')) {
      console.log('✅ HSN verified in list.');
    } else {
      console.error('❌ HSN not found in list!');
    }

    // 3. Verify Product MDM
    console.log('🚀 Testing POST /admin/mdm/products...');
    const productRes = await axios.post(
      `${API_URL}/admin/mdm/products`,
      {
        name: 'Test Global Product',
        category: 'Test Category',
        hsnCode: 'TESTHSN',
        taxRate: '12',
      },
      { headers },
    );
    console.log('✅ Product created:', productRes.data);

    console.log('🚀 Testing GET /admin/mdm/products...');
    const productList = await axios.get(
      `${API_URL}/admin/mdm/products?search=Test`,
      { headers },
    );
    console.log('✅ Product list sample:', productList.data.data[0]);

    if (
      productList.data.data.some((p: any) => p.name === 'Test Global Product')
    ) {
      console.log('✅ Global Product verified in list.');
    } else {
      console.error('❌ Global Product not found in list!');
    }
  } catch (error: any) {
    console.error(
      '❌ Verification failed:',
      error.response?.data || error.message,
    );
  }
}

verifyAdminSuite();
