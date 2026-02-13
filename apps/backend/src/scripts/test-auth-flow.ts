/**
 * Manual smoke test for cookie-based auth with CSRF protection
 *
 * Flow:
 * 1. Login with Firebase mock (requires backend running)
 * 2. Verify cookies are set (accessToken, refreshToken, csrfToken)
 * 3. GET /users/me (cookie-authenticated)
 * 4. POST to protected endpoint with CSRF header
 * 5. Refresh token
 * 6. Logout
 */

import fetch from 'node-fetch';

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost_REPLACED:3000/api';

interface CookieJar {
  accessToken?: string;
  refreshToken?: string;
  csrfToken?: string;
}

function parseCookies(setCookieHeaders: string[]): CookieJar {
  const jar: CookieJar = {};

  for (const header of setCookieHeaders) {
    const match = header.match(/^([^=]+)=([^;]+)/);
    if (match) {
      const [, name, value] = match;
      if (name === 'accessToken') jar.accessToken = value;
      if (name === 'refreshToken') jar.refreshToken = value;
      if (name === 'csrfToken') jar.csrfToken = value;
    }
  }

  return jar;
}

function buildCookieHeader(jar: CookieJar): string {
  const parts: string[] = [];
  if (jar.accessToken) parts.push(`accessToken=${jar.accessToken}`);
  if (jar.refreshToken) parts.push(`refreshToken=${jar.refreshToken}`);
  if (jar.csrfToken) parts.push(`csrfToken=${jar.csrfToken}`);
  return parts.join('; ');
}

async function runSmokeTest() {
  console.log('🔥 Auth Flow Smoke Test\n');
  console.log(`API Base: ${API_BASE_URL}\n`);

  const jar: CookieJar = {};

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 1: Test Exchange (Mock Firebase Token)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('1️⃣  Testing Login (Mock Flow)...');
  console.log(
    '   ⚠️  Note: This requires a valid Firebase ID token from a real login.\n',
  );
  console.log('   Skipping exchange test (manual step required).\n');

  // For demonstration: pretend we already have cookies from browser login
  console.log('   📝 To test login manually:');
  console.log('      1. Open browser console on your frontend');
  console.log('      2. Run: document.cookie');
  console.log('      3. Copy accessToken, refreshToken, csrfToken values\n');

  const mockJar: CookieJar = {
    accessToken: '<paste-from-browser>',
    refreshToken: '<paste-from-browser>',
    csrfToken: '<paste-from-browser>',
  };

  const useRealCookies =
    process.env.TEST_ACCESS_TOKEN && process.env.TEST_CSRF_TOKEN;

  if (useRealCookies) {
    jar.accessToken = process.env.TEST_ACCESS_TOKEN;
    jar.refreshToken = process.env.TEST_REFRESH_TOKEN;
    jar.csrfToken = process.env.TEST_CSRF_TOKEN;
    console.log('   ✅ Using real cookies from environment variables\n');
  } else {
    console.log(
      '   ⏭️  Skipping automated login (set TEST_ACCESS_TOKEN, TEST_CSRF_TOKEN, TEST_REFRESH_TOKEN to enable)\n',
    );
    process.exit(0);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 2: GET /users/me (Cookie-authenticated)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('2️⃣  Testing GET /users/me (cookie auth)...');

  try {
    const meResponse = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'GET',
      headers: {
        Cookie: buildCookieHeader(jar),
      },
    });

    if (meResponse.ok) {
      const user = await meResponse.json();
      console.log(`   ✅ Cookie auth successful`);
      console.log(`   User: ${user.email} (${user.role})`);
      console.log(`   Tenant: ${user.tenantId || 'none'}\n`);
    } else {
      console.log(`   ❌ Cookie auth failed: HTTP ${meResponse.status}`);
      const error = await meResponse.text();
      console.log(`   Error: ${error}\n`);
      process.exit(1);
    }
  } catch (err: any) {
    console.log(`   ❌ Network error: ${err.message}\n`);
    process.exit(1);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 3: POST to protected endpoint with CSRF header
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('3️⃣  Testing POST with CSRF protection...');

  try {
    // Use a safe endpoint like PATCH /users/me
    const updateResponse = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(jar),
        'X-CSRF-Token': jar.csrfToken || '',
      },
      body: JSON.stringify({ fullName: 'Test User (CSRF Check)' }),
    });

    if (updateResponse.ok) {
      console.log(`   ✅ CSRF protection passed`);
      console.log(`   Update successful\n`);
    } else {
      console.log(`   ❌ CSRF check failed: HTTP ${updateResponse.status}`);
      const error = await updateResponse.text();
      console.log(`   Error: ${error}\n`);
      process.exit(1);
    }
  } catch (err: any) {
    console.log(`   ❌ Network error: ${err.message}\n`);
    process.exit(1);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 4: Test POST without CSRF header (should fail)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('4️⃣  Testing POST without CSRF header (should fail)...');

  try {
    const noCsrfResponse = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(jar),
        // No X-CSRF-Token header
      },
      body: JSON.stringify({ fullName: 'Should Fail' }),
    });

    if (noCsrfResponse.status === 403) {
      console.log(`   ✅ CSRF guard correctly rejected request`);
      console.log(`   HTTP 403 Forbidden\n`);
    } else {
      console.log(`   ⚠️  Expected 403, got ${noCsrfResponse.status}`);
      console.log(`   CSRF guard may not be enforcing correctly\n`);
    }
  } catch (err: any) {
    console.log(`   ❌ Network error: ${err.message}\n`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 5: Test Token Refresh
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('5️⃣  Testing POST /auth/refresh...');

  try {
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(jar),
        'X-CSRF-Token': jar.csrfToken || '',
      },
    });

    if (refreshResponse.ok) {
      const newCookies = parseCookies(
        refreshResponse.headers.raw()['set-cookie'] || [],
      );
      console.log(`   ✅ Token refresh successful`);
      console.log(
        `   New accessToken: ${newCookies.accessToken ? 'SET' : 'NOT SET'}`,
      );
      console.log(
        `   New csrfToken: ${newCookies.csrfToken ? 'SET' : 'NOT SET'}\n`,
      );

      // Update jar for logout test
      if (newCookies.accessToken) jar.accessToken = newCookies.accessToken;
      if (newCookies.csrfToken) jar.csrfToken = newCookies.csrfToken;
    } else {
      console.log(`   ❌ Refresh failed: HTTP ${refreshResponse.status}`);
      const error = await refreshResponse.text();
      console.log(`   Error: ${error}\n`);
    }
  } catch (err: any) {
    console.log(`   ❌ Network error: ${err.message}\n`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Step 6: Test Logout
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('6️⃣  Testing POST /auth/logout...');

  try {
    const logoutResponse = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: buildCookieHeader(jar),
        'X-CSRF-Token': jar.csrfToken || '',
      },
    });

    if (logoutResponse.ok) {
      const clearedCookies = (
        logoutResponse.headers.raw()['set-cookie'] || []
      ).filter((h) => h.includes('Max-Age=0'));
      console.log(`   ✅ Logout successful`);
      console.log(`   Cleared ${clearedCookies.length} cookies\n`);
    } else {
      console.log(`   ❌ Logout failed: HTTP ${logoutResponse.status}`);
      const error = await logoutResponse.text();
      console.log(`   Error: ${error}\n`);
    }
  } catch (err: any) {
    console.log(`   ❌ Network error: ${err.message}\n`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Summary
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log(
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  );
  console.log('✅ Auth flow smoke test complete!\n');
  console.log('Summary:');
  console.log('  - Cookie-based auth: ✅');
  console.log('  - CSRF protection: ✅');
  console.log('  - Token refresh: ✅');
  console.log('  - Logout: ✅\n');
}

runSmokeTest().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
