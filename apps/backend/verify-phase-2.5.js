#!/usr/bin/env node

/**
 * Phase 2.5 Code Compilation & Structure Verification
 * Tests that all endpoints compile correctly and have expected structure
 */

const fs = require('fs');
const path = require('path');

const testResults = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
  },
};

function test(name, passed, details = {}) {
  testResults.tests.push({
    name,
    result: passed ? 'PASS' : 'FAIL',
    details,
  });
  testResults.summary.total++;
  if (passed) testResults.summary.passed++;
  else testResults.summary.failed++;

  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}`);
  if (Object.keys(details).length > 0) {
    console.log(`   ${JSON.stringify(details)}`);
  }
}

async function runTests() {
  console.log('\n🔍 Phase 2.5 Code Verification Test Suite\n');
  console.log('Time:', new Date().toISOString(), '\n');

  const baseDir = __dirname;

  // Test 1: Customers Service
  console.log('--- Test 1: Customers Service ---');
  try {
    const content = fs.readFileSync(
      path.join(baseDir, 'src/core/customers/customers.service.ts'),
      'utf8',
    );

    test(
      'Customers Service: Has pagination options parameter',
      content.includes(
        'options?: { skip?: number; take?: number; search?: string }',
      ),
    );

    test(
      'Customers Service: Uses parallel queries',
      content.includes('Promise.all') &&
        content.includes('findMany') &&
        content.includes('count'),
    );

    test(
      'Customers Service: Has field selection',
      content.includes('select:') && content.includes('id: true'),
    );

    test(
      'Customers Service: Returns pagination response',
      content.includes('return { data:') &&
        content.includes('total') &&
        content.includes('skip:') &&
        content.includes('take:'),
    );
  } catch (err) {
    test('Customers Service: File read', false, { error: err.message });
  }

  // Test 2: Customers Controller
  console.log('\n--- Test 2: Customers Controller ---');
  try {
    const content = fs.readFileSync(
      path.join(baseDir, 'src/core/customers/customers.controller.ts'),
      'utf8',
    );

    test(
      'Customers Controller: Has Query import',
      content.includes('import') && content.includes('Query'),
    );

    test(
      'Customers Controller: Accepts skip parameter',
      content.includes("@Query('skip')"),
    );

    test(
      'Customers Controller: Accepts take parameter',
      content.includes("@Query('take')"),
    );

    test(
      'Customers Controller: Accepts search parameter',
      content.includes("@Query('search')"),
    );

    test(
      'Customers Controller: Passes options to service',
      content.includes('skip: skip ? parseInt(skip, 10)') &&
        content.includes('take: take ? parseInt(take, 10)'),
    );
  } catch (err) {
    test('Customers Controller: File read', false, { error: err.message });
  }

  // Test 3: Invoices Service
  console.log('\n--- Test 3: Invoices Service ---');
  try {
    const content = fs.readFileSync(
      path.join(baseDir, 'src/core/sales/sales.service.ts'),
      'utf8',
    );

    test(
      'Invoices Service: Uses receipt aggregation',
      content.includes('groupBy') && content.includes('linkedInvoiceId'),
    );

    test(
      'Invoices Service: Maps receipt summaries',
      content.includes('paidAmountMap') && content.includes('_sum'),
    );

    test(
      'Invoices Service: No full receipt includes',
      !content.includes('include: { receipts: true }'),
    );

    test(
      'Invoices Service: Calculates balance correctly',
      content.includes('balanceAmount = invoice.totalAmount - paidAmount'),
    );
  } catch (err) {
    test('Invoices Service: File read', false, { error: err.message });
  }

  // Test 4: Follow-ups Service
  console.log('\n--- Test 4: Follow-ups Service ---');
  try {
    const content = fs.readFileSync(
      path.join(baseDir, 'src/core/follow-ups/follow-ups.service.ts'),
      'utf8',
    );

    test(
      'Follow-ups Service: listMyFollowUps has pagination',
      content.includes('async listMyFollowUps') &&
        content.includes('options?: { skip?: number; take?: number }'),
    );

    test(
      'Follow-ups Service: listMyFollowUps uses parallel queries',
      content.match(/async listMyFollowUps[\s\S]*?Promise\.all/),
    );

    test(
      'Follow-ups Service: listAllFollowUps has pagination',
      content.includes('async listAllFollowUps') &&
        content.includes('options?: { skip?: number; take?: number }'),
    );

    test(
      'Follow-ups Service: Returns paginated response',
      content.match(/return \{ data:[\s\S]*?total[\s\S]*?skip[\s\S]*?take/),
    );
  } catch (err) {
    test('Follow-ups Service: File read', false, { error: err.message });
  }

  // Test 5: Follow-ups Controller
  console.log('\n--- Test 5: Follow-ups Controller ---');
  try {
    const content = fs.readFileSync(
      path.join(baseDir, 'src/core/follow-ups/follow-ups.controller.ts'),
      'utf8',
    );

    test(
      'Follow-ups Controller: listMy accepts skip',
      content.includes("@Query('skip')") || content.includes('skip?: string'),
    );

    test(
      'Follow-ups Controller: listMy accepts take',
      content.includes("@Query('take')") || content.includes('take?: string'),
    );

    test(
      'Follow-ups Controller: listAll accepts pagination',
      content.match(/async listAll[\s\S]*?skip[\s\S]*?take/),
    );
  } catch (err) {
    test('Follow-ups Controller: File read', false, { error: err.message });
  }

  // Test 6: Gym Attendance Service
  console.log('\n--- Test 6: Gym Attendance Service ---');
  try {
    const content = fs.readFileSync(
      path.join(
        baseDir,
        'src/modules/gym/attendance/gym-attendance.service.ts',
      ),
      'utf8',
    );

    test(
      'Attendance Service: listTodayAttendance has pagination',
      content.includes('async listTodayAttendance') &&
        content.includes('options?: { skip?: number; take?: number }'),
    );

    test(
      'Attendance Service: listTodayAttendance uses parallel queries',
      content.match(/async listTodayAttendance[\s\S]*?Promise\.all/),
    );

    test(
      'Attendance Service: listCurrentlyCheckedInMembers has pagination',
      content.includes('async listCurrentlyCheckedInMembers') &&
        content.includes('options?: { skip?: number; take?: number }'),
    );

    test(
      'Attendance Service: Returns mapped response',
      content.includes('attendanceId: r.id'),
    );
  } catch (err) {
    test('Attendance Service: File read', false, { error: err.message });
  }

  // Test 7: Gym Attendance Controller
  console.log('\n--- Test 7: Gym Attendance Controller ---');
  try {
    const content = fs.readFileSync(
      path.join(
        baseDir,
        'src/modules/gym/attendance/gym-attendance.controller.ts',
      ),
      'utf8',
    );

    test(
      'Attendance Controller: Has Query import',
      content.includes('import') && content.includes('Query'),
    );

    test(
      'Attendance Controller: today method accepts pagination',
      content.match(/async today[\s\S]*?skip[\s\S]*?take/),
    );

    test(
      'Attendance Controller: getInsideMembers accepts pagination',
      content.match(/async getInsideMembers[\s\S]*?skip[\s\S]*?take/),
    );
  } catch (err) {
    test('Attendance Controller: File read', false, { error: err.message });
  }

  // Test 8: TypeScript Compilation
  console.log('\n--- Test 8: TypeScript Compilation ---');
  try {
    const { execSync } = require('child_process');
    const buildOutput = execSync('npm run build 2>&1', {
      cwd: baseDir,
      encoding: 'utf8',
    });

    test(
      'TypeScript: Builds without errors',
      buildOutput.includes('Loaded Prisma config') &&
        !buildOutput.includes('error TS'),
    );
  } catch (err) {
    test('TypeScript: Build success', false, { error: err.message });
  }

  // Test 9: Response Structure Consistency
  console.log('\n--- Test 9: Response Structure Consistency ---');
  try {
    const files = [
      'src/core/customers/customers.service.ts',
      'src/core/follow-ups/follow-ups.service.ts',
      'src/modules/gym/attendance/gym-attendance.service.ts',
    ];

    let allConsistent = true;
    for (const file of files) {
      const content = fs.readFileSync(path.join(baseDir, file), 'utf8');
      if (
        !content.includes('return { data:') ||
        !content.includes('total:') ||
        !content.includes('skip:') ||
        !content.includes('take:')
      ) {
        allConsistent = false;
        break;
      }
    }
    test(
      'Response Structure: All endpoints return { data, total, skip, take }',
      allConsistent,
    );
  } catch (err) {
    test('Response Structure: Check', false, { error: err.message });
  }

  // Test 10: Documentation
  console.log('\n--- Test 10: Documentation ---');
  try {
    const docs = [
      'PHASE_2.5_IMPLEMENTATION_SUMMARY.md',
      'PHASE_2.5_TESTING_GUIDE.md',
      'TIER4_PERFORMANCE_ROADMAP.md',
    ];

    let allExist = true;
    for (const doc of docs) {
      if (!fs.existsSync(path.join(baseDir, doc))) {
        allExist = false;
        console.log(`  Missing: ${doc}`);
      }
    }
    test('Documentation: All guides present', allExist);
  } catch (err) {
    test('Documentation: Check', false, { error: err.message });
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 CODE VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Checks: ${testResults.summary.total}`);
  console.log(`Passed: ${testResults.summary.passed} ✅`);
  console.log(`Failed: ${testResults.summary.failed} ❌`);
  const rate = Math.round(
    (testResults.summary.passed / testResults.summary.total) * 100,
  );
  console.log(`Success Rate: ${rate}%`);

  if (testResults.summary.failed === 0) {
    console.log('\n🎉 All verification checks passed!');
    console.log('Phase 2.5 implementation is complete and ready for testing.');
  }
  console.log('='.repeat(70) + '\n');

  // Save report
  const reportPath = path.join(baseDir, 'PHASE_2.5_VERIFICATION_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`📄 Report saved to: PHASE_2.5_VERIFICATION_REPORT.json\n`);

  process.exit(testResults.summary.failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('❌ Verification error:', err);
  process.exit(1);
});
