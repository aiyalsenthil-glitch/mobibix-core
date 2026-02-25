
const axios = require('axios');
const jwt = require('jsonwebtoken');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BASE_URL = 'http://localhost_REPLACED:3000/api';
const JWT_SECRET = process.env.JWT_SECRET;
const TENANT_ID = 'test-tenant-cancellation';
const SHOP_ID = 'test-shop-cancellation';

async function runTest() {
  try {
    console.log('--- STARTING PRODUCT IMPORT/EXPORT TEST ---');

    // 1. Generate Token
    const payload = {
      sub: 'test-owner-cancellation',
      tenantId: TENANT_ID,
      role: 'OWNER',
    };
    const token = jwt.sign(payload, JWT_SECRET);
    const headers = { Authorization: `Bearer ${token}` };

    // 2. Test Export (Empty or existing)
    console.log('\n--- 1. Testing Export ---');
    const exportRes = await axios.get(`${BASE_URL}/mobileshop/products/export?shopId=${SHOP_ID}&includeStock=true`, { 
        headers,
        responseType: 'text' 
    });
    console.log('Export Response Status:', exportRes.status);
    console.log('Export Headers:', exportRes.headers['content-type']);
    console.log('Sample Data from Export (first 100 chars):', exportRes.data.substring(0, 100));

    // 3. Test Import
    console.log('\n--- 2. Testing Import ---');
    const csvPath = path.join(__dirname, 'test-import-template.csv');
    const form = new FormData();
    form.append('file', fs.createReadStream(csvPath));
    form.append('shopId', SHOP_ID);
    form.append('includeStock', 'true');

    const importRes = await axios.post(`${BASE_URL}/mobileshop/products/import`, form, {
      headers: {
        ...headers,
        ...form.getHeaders(),
      },
    });

    console.log('Import Status:', importRes.status);
    console.log('Import Result:', importRes.data);

    // 4. Verify Imported Products
    console.log('\n--- 3. Verifying Imported Products ---');
    const listRes = await axios.get(`${BASE_URL}/mobileshop/products?shopId=${SHOP_ID}`, { headers });
    const products = Array.isArray(listRes.data) ? listRes.data : listRes.data.data;
    console.log('Total Products in Shop:', products.length);
    
    const importedProduct = products.find(p => p.name === 'iPhone 14');
    if (importedProduct) {
      console.log('✅ Found imported product: iPhone 14');
      console.log('   Stock Level:', importedProduct.stockQty);
      console.log('   Selling Price:', importedProduct.salePrice);
    } else {
      console.log('❌ iPhone 14 NOT found in list!');
    }

    // 5. Test Stock Overview (New Endpoint)
    console.log('\n--- 4. Testing Stock Overview ---');
    const overviewRes = await axios.get(`${BASE_URL}/mobileshop/stock/overview?shopId=${SHOP_ID}`, { headers });
    console.log('Overview Data:', overviewRes.data);

    console.log('\n--- PRODUCT IMPORT/EXPORT TEST COMPLETE ---');

  } catch (error) {
    console.error('Test Failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

runTest();
