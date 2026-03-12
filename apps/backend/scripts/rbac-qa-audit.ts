
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost_REPLACED:3000/api';

async function runAudit() {
  console.log('🚀 Starting RBAC Audit...');

  try {
    // 1. Login
    const loginRes = await axios.post(`${BASE_URL}/auth/login-qa`, {
      email: 'test@gmail.com',
      password: 'test@123'
    });
    const { accessToken, user: adminUser } = loginRes.data.data || loginRes.data;
    const tenantId = adminUser.tenantId;
    const headers = { Authorization: `Bearer ${accessToken}` };

    // 2. Templates
    const templatesRes = await axios.get(`${BASE_URL}/permissions/roles/templates`, { headers });
    const templates = templatesRes.data.data || templatesRes.data;

    // 3. Modules
    const modulesRes = await axios.get(`${BASE_URL}/permissions/roles/modules`, { headers });
    const modules = modulesRes.data.data || modulesRes.data;

    // 4. Staff
    const staffEmails = Array.from({ length: 10 }, (_, i) => `staff_qa_${i + 1}@test.com`);
    const shop = await prisma.shop.findFirst({ where: { tenantId } });
    if (!shop) throw new Error('No shop found');

    for (let i = 0; i < staffEmails.length; i++) {
        const email = staffEmails[i];
        const template = templates[i % templates.length];
        const REMOVED_AUTH_PROVIDERUid = `fake_uid_${email}`;

        const user = await prisma.user.upsert({
            where: { REMOVED_AUTH_PROVIDERUid },
            update: { deletedAt: null },
            create: { email, fullName: `QA Staff ${i+1}`, REMOVED_AUTH_PROVIDERUid, role: 'USER' }
        });

        await prisma.userTenant.upsert({
            where: { userId_tenantId: { userId: user.id, tenantId } },
            update: { role: 'STAFF', deletedAt: null },
            create: { userId: user.id, tenantId, role: 'STAFF' }
        });

        await prisma.shopStaff.upsert({
            where: { userId_tenantId_shopId: { userId: user.id, tenantId, shopId: shop.id } },
            update: { roleId: template.id, isActive: true, deletedAt: null },
            create: { userId: user.id, tenantId, shopId: shop.id, roleId: template.id, isActive: true }
        });
    }

    // 5. Verify
    const report: any[] = [];
    const testActions = [
        { module: 'Sales', method: 'get', url: `/mobileshop/sales/invoices?shopId=${shop.id}`, perm: 'mobile_shop.sale.view' },
        { module: 'Jobcard', method: 'get', url: `/mobileshop/shops/${shop.id}/job-cards`, perm: 'mobile_shop.jobcard.view' },
        { module: 'Inventory', method: 'get', url: `/mobileshop/inventory/stock-levels?shopId=${shop.id}`, perm: 'mobile_shop.inventory.view' },
        { module: 'Purchase', method: 'get', url: `/purchases?shopId=${shop.id}`, perm: 'mobile_shop.purchase.view' },
        { module: 'Reports', method: 'get', url: `/mobileshop/reports/sales/summary?shopId=${shop.id}`, perm: 'core.report.view' },
    ];

    for (const email of staffEmails) {
        console.log(`Testing ${email}...`);
        const staffLogin = await axios.post(`${BASE_URL}/auth/login-qa`, { email });
        const loginData = staffLogin.data.data || staffLogin.data;
        const sHeaders = { Authorization: `Bearer ${loginData.accessToken}` };
        const sPerms = loginData.user.permissions as string[];

        for (const action of testActions) {
            let status = 0;
            try {
                const res = await axios({
                    method: action.method,
                    url: `http://localhost_REPLACED:3000/api${action.url}`,
                    headers: sHeaders
                });
                status = res.status;
            } catch (err: any) {
                status = err.response?.status || 500;
            }

            const hasPerm = sPerms.includes(action.perm);
            const expected = hasPerm ? [200, 201] : [403];
            const pass = expected.includes(status);

            report.push({
                Staff: email,
                Role: templateLookup(templates, email, staffEmails),
                Module: action.module,
                Action: action.method.toUpperCase(),
                Endpoint: action.url,
                Response: status,
                Result: pass ? 'PASS' : 'FAIL',
                HasPerm: hasPerm ? 'YES' : 'NO'
            });
        }
    }

    console.table(report);
    
    // Save Report to File
    fs.writeFileSync('rbac-test-report.json', JSON.stringify(report, null, 2));

    const bugs = report.filter(r => r.Result === 'FAIL');
    if (bugs.length > 0) {
        console.log('\n❌ RBAC BUGS DETECTED:');
        console.table(bugs);
    } else {
        console.log('\n✅ ALL PERMISSIONS ENFORCED CORRECTLY.');
    }

  } catch (err: any) {
    console.error('Fatal Error:', err.response?.data || err.message);
  }
}

function templateLookup(templates: any[], email: string, allEmails: string[]) {
    const idx = allEmails.indexOf(email);
    return templates[idx % templates.length].name;
}

runAudit();
