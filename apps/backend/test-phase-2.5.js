#!/usr/bin/env node

/**
 * Phase 2.5 Automated Test Suite
 * Tests pagination and optimization on all endpoints
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost_REPLACED:3000';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'test-token';
const TENANT_ID = process.env.TEST_TENANT_ID || 'test-tenant';

// Test Results Storage
const testResults = {
  startTime: new Date(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
  },
};

// Helper: Make HTTP request
async function makeRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            time: Date.now(),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            time: Date.now(),
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test helper
function test(name, fn) {
  testResults.tests.push({
    name,
    result: 'PENDING',
    error: null,
    details: {},
  });
  return fn;
}

// Log test result
function logTest(name, passed, error = null, details = {}) {
  const result = testResults.tests.find((t) => t.name === name);
  if (result) {
    result.result = passed ? 'PASS' : 'FAIL';
    result.error = error;
    result.details = details;
  }
  testResults.summary.total++;
  if (passed) testResults.summary.passed++;
  else testResults.summary.failed++;

  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}`);
  if (error) console.log(`   Error: ${error}`);
}

// ============================================================================
// TEST SUITE
// ============================================================================

async function runTests() {
  console.log('\n🧪 Starting Phase 2.5 Automated Test Suite\n');
  console.log(`Backend URL: ${BASE_URL}`);
  console.log(`Time: ${testResults.startTime.toISOString()}\n`);

  // Test 1: Customers List
  console.log('--- Test 1: Customers List ---');
  try {
    // Test without pagination
    const res1 = await makeRequest('/core/customers');
    logTest(
      'Customers: Default pagination',
      res1.status === 200 && res1.body?.data,
      null,
      {
        status: res1.status,
        hasData: !!res1.body?.data,
        hasTotal: !!res1.body?.total,
        hasSkip: res1.body?.skip !== undefined,
        hasTake: res1.body?.take !== undefined,
      },
    );

    // Test with pagination
    const res2 = await makeRequest('/core/customers?skip=0&take=20');
    logTest(
      'Customers: Pagination parameters',
      res2.status === 200 && res2.body?.take === 20,
      null,
      {
        skip: res2.body?.skip,
        take: res2.body?.take,
        dataLength: res2.body?.data?.length,
      },
    );

    // Test with search
    const res3 = await makeRequest(
      '/core/customers?skip=0&take=20&search=test',
    );
    logTest(
      'Customers: Search functionality',
      res3.status === 200 && res3.body?.data,
      null,
      {
        searchResults: res3.body?.data?.length,
      },
    );

    // Test response structure
    const hasValidStructure =
      res1.body?.data &&
      Array.isArray(res1.body.data) &&
      typeof res1.body.total === 'number' &&
      typeof res1.body.skip === 'number' &&
      typeof res1.body.take === 'number';
    logTest('Customers: Response structure valid', hasValidStructure);
  } catch (err) {
    logTest('Customers: All tests', false, err.message);
  }

  // Test 2: Follow-ups List
  console.log('\n--- Test 2: Follow-ups List ---');
  try {
    // Test my follow-ups
    const res1 = await makeRequest('/core/follow-ups/my?skip=0&take=50');
    logTest(
      'Follow-ups: My follow-ups pagination',
      res1.status === 200 && res1.body?.data,
      null,
      {
        status: res1.status,
        dataLength: res1.body?.data?.length,
        total: res1.body?.total,
      },
    );

    // Test all follow-ups (admin)
    const res2 = await makeRequest('/core/follow-ups/all?skip=0&take=50');
    logTest(
      'Follow-ups: All follow-ups pagination',
      res2.status === 200 && res2.body?.data,
      null,
      {
        status: res2.status,
        dataLength: res2.body?.data?.length,
      },
    );

    // Verify response structure
    const hasValidStructure =
      res1.body?.data &&
      Array.isArray(res1.body.data) &&
      typeof res1.body.total === 'number';
    logTest('Follow-ups: Response structure valid', hasValidStructure);

    // Check related data is loaded
    const hasRelatedData =
      res1.body?.data?.length > 0 &&
      (res1.body.data[0].assignedToUser || res1.body.data[0].customer);
    logTest(
      'Follow-ups: Related data loaded',
      hasRelatedData || res1.body?.data?.length === 0,
    );
  } catch (err) {
    logTest('Follow-ups: All tests', false, err.message);
  }

  // Test 3: Gym Attendance
  console.log('\n--- Test 3: Gym Attendance ---');
  try {
    // Test today's attendance
    const res1 = await makeRequest('/gym/attendance/today?skip=0&take=50');
    logTest(
      'Attendance: Today attendance pagination',
      res1.status === 200 && res1.body?.data,
      null,
      {
        status: res1.status,
        dataLength: res1.body?.data?.length,
        total: res1.body?.total,
      },
    );

    // Test checked-in members
    const res2 = await makeRequest(
      '/gym/attendance/inside-members?skip=0&take=50',
    );
    logTest(
      'Attendance: Checked-in members pagination',
      res2.status === 200 && res2.body?.data,
      null,
      {
        status: res2.status,
        dataLength: res2.body?.data?.length,
        total: res2.body?.total,
      },
    );

    // Verify response structure
    const hasValidStructure =
      res1.body?.data &&
      Array.isArray(res1.body.data) &&
      typeof res1.body.total === 'number' &&
      typeof res1.body.skip === 'number' &&
      typeof res1.body.take === 'number';
    logTest('Attendance: Response structure valid', hasValidStructure);

    // Verify attendance fields
    const hasCorrectFields =
      res1.body?.data?.length === 0 ||
      (res1.body.data[0].attendanceId &&
        res1.body.data[0].checkInTime &&
        res1.body.data[0].memberId &&
        res1.body.data[0].memberName);
    logTest('Attendance: Data fields correct', hasCorrectFields);
  } catch (err) {
    logTest('Attendance: All tests', false, err.message);
  }

  // Test 4: Backward Compatibility
  console.log('\n--- Test 4: Backward Compatibility ---');
  try {
    // Test customers without params (should use defaults)
    const res1 = await makeRequest('/core/customers');
    const usesDefaults = res1.body?.skip === 0 && res1.body?.take === 50;
    logTest('Backward Compat: Customers uses defaults', usesDefaults, null, {
      skip: res1.body?.skip,
      take: res1.body?.take,
    });

    // Test with old-style params
    const res2 = await makeRequest('/core/customers?skip=10&take=30');
    const respectsParams = res2.body?.skip === 10 && res2.body?.take === 30;
    logTest(
      'Backward Compat: Custom pagination respected',
      respectsParams,
      null,
      {
        skip: res2.body?.skip,
        take: res2.body?.take,
      },
    );
  } catch (err) {
    logTest('Backward Compat: All tests', false, err.message);
  }

  // Test 5: Performance Checks
  console.log('\n--- Test 5: Performance Baseline ---');
  try {
    const start = Date.now();
    const res = await makeRequest('/core/customers?skip=0&take=50');
    const duration = Date.now() - start;

    logTest('Performance: Customers response time', duration < 5000, null, {
      duration: `${duration}ms`,
      status: res.status,
    });
  } catch (err) {
    logTest('Performance: All tests', false, err.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`Passed: ${testResults.summary.passed} ✅`);
  console.log(`Failed: ${testResults.summary.failed} ❌`);
  console.log(
    `Success Rate: ${Math.round((testResults.summary.passed / testResults.summary.total) * 100)}%`,
  );
  console.log('='.repeat(60) + '\n');

  // Save results
  testResults.endTime = new Date();
  testResults.duration = testResults.endTime - testResults.startTime;

  const reportPath = path.join(__dirname, 'TEST_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);

  // Exit with appropriate code
  process.exit(testResults.summary.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((err) => {
  console.error('❌ Test suite error:', err);
  process.exit(1);
});
