import axios from 'axios';

const API_URL = 'http://localhost_REPLACED:3000/api';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN;

async function verifyAdminSuite() {


  const headers = { Authorization: `Bearer ${JWT_TOKEN}` };

  try {
    // 1. Verify Global Analytics

    const statsRes = await axios.get(`${API_URL}/admin/analytics/global`, {
      headers,
    });


    if (
      typeof statsRes.data.mrr !== 'number' ||
      typeof statsRes.data.totalTenants !== 'number'
    ) {
      console.error('❌ Stats structure invalid!');
    }

    // 2. Verify HSN MDM

    const hsnRes = await axios.post(
      `${API_URL}/admin/mdm/hsn`,
      {
        code: 'TESTHSN',
        description: 'Test HSN Description',
        gstRate: '12',
      },
      { headers },
    );


    const hsnList = await axios.get(`${API_URL}/admin/mdm/hsn?search=TESTHSN`, {
      headers,
    });
    if (hsnList.data.some((h: any) => h.code === 'TESTHSN')) {

    } else {
      console.error('❌ HSN not found in list!');
    }

    // 3. Verify Product MDM

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



    const productList = await axios.get(
      `${API_URL}/admin/mdm/products?search=Test`,
      { headers },
    );


    if (
      productList.data.data.some((p: any) => p.name === 'Test Global Product')
    ) {

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
