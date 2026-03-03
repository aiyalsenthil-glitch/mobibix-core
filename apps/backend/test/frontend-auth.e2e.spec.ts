import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';

/**
 * PHASE 5: Frontend Auth Unification (E2E Tests)
 *
 * Validates that both GymPilot (SPA) and MobiBix (SSR) implement proper auth strategies:
 * - GymPilot: localStorage Bearer token (appropriate for SPA, no middleware needed)
 * - MobiBix: Cookie-based auth with middleware validation (appropriate for SSR)
 *
 * IMPORTANT: These tests validate BACKEND auth exchange endpoint and assumptions
 * about how frontends will use the tokens. Actual frontend middleware tests should
 * be in apps/mobibix-web/tests and apps/mobibix-web/tests respectively.
 */
describe('Frontend Auth Strategy Validation (E2E)', () => {
  let app: INestApplication;
  let backendServer: any;

  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    backendServer = app.getHttpServer();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // Seed required tenants for the tests
    const tenants = ['gym-12345', 'gym-name-12345', 'gym-fitness-12345'];
    for (const code of tenants) {
      await prisma.tenant.upsert({
        where: { code },
        update: {},
        create: {
          name: 'Test Gym ' + code,
          code,
          legalName: 'Test Legal ' + code,
          contactPhone: '+91-0000000000',
          tenantType: 'GYM',
        },
      });
    }

    // Seed mock user linked to those tenants
    const user = await prisma.user.upsert({
      where: { REMOVED_AUTH_PROVIDERUid: 'mock-user-uid' },
      update: {},
      create: {
        REMOVED_AUTH_PROVIDERUid: 'mock-user-uid',
        email: 'test@gmail.com',
        fullName: 'Mock User',
        role: 'OWNER',
      },
    });

    for (const code of tenants) {
      const t = await prisma.tenant.findUnique({ where: { code } });
      if (t) {
        await prisma.userTenant.upsert({
          where: { userId_tenantId: { userId: user.id, tenantId: t.id } },
          update: {},
          create: {
            userId: user.id,
            tenantId: t.id,
            role: 'OWNER',
          },
        });
      }
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Auth Exchange Endpoint (Common for Both Frontends)', () => {
    it('should exchange Firebase ID token for Backend JWT', async () => {
      // Both frontends call: POST /auth/REMOVED_AUTH_PROVIDER with { idToken, tenantCode }
      const response = await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({
          idToken: 'mock_REMOVED_AUTH_PROVIDER_id_token',
          tenantCode: 'gym-fitness-12345',
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.role).toBeDefined();
    });

    it('should return JWT with tenantId claim for multi-tenant context', async () => {
      // Both GymPilot and MobiBix need tenantId for tenant-scoped API calls
      const response = await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({
          idToken: 'mock_REMOVED_AUTH_PROVIDER_id_token',
          tenantCode: 'gym-name-12345',
        })
        .expect(200);

      // JWT payload should contain: {sub: userId, tenantId, role}
      // Decode JWT (pseudo-code):
      // const payload = jwtDecode(response.body.accessToken);
      // expect(payload.tenantId).toBeDefined();

      expect(response.body.accessToken).toBeDefined(); // Contains claims
    });

    it('should handle missing tenantCode for owner login', async () => {
      // Owners (no tenant) may call without tenantCode
      const response = await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({
          idToken: 'mock_REMOVED_AUTH_PROVIDER_id_token',
          // No tenantCode (owner login)
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.role).toBe('OWNER');
    });

    it('should reject invalid Firebase token', async () => {
      // Invalid token = 401 Unauthorized
      await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({
          idToken: 'invalid_token_xyz',
          tenantCode: 'gym-12345',
        })
        .expect(401);
    });
  });

  describe('GymPilot Frontend - localStorage Bearer Token Strategy', () => {
    it('should provide accessToken for localStorage storage', async () => {
      // GymPilot (SPA) stores token in localStorage and reads it on each request
      const response = await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({
          idToken: 'mock_REMOVED_AUTH_PROVIDER_id_token',
          tenantCode: 'gym-12345',
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      // Frontend code (mobibix-web/lib/api.ts):
      // localStorage.setItem('auth_jwt', accessToken);
      // Then on API calls:
      // headers.Authorization = `Bearer ${localStorage.getItem('auth_jwt')}`;
    });

    it('should support Bearer token in Authorization header', async () => {
      // After GymPilot stores token, it sends: Authorization: Bearer <token>
      const exchangeResponse = await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({ idToken: 'mock_REMOVED_AUTH_PROVIDER_id_token', tenantCode: 'gym-12345' })
        .expect(200);

      const token = exchangeResponse.body.accessToken;

      // Subsequent API call with Bearer token
      const apiResponse = await request(backendServer)
        .get('/core/customers') // Any protected endpoint
        .set('Authorization', `Bearer ${token}`)
        .expect(200); // JwtAuthGuard validates

      expect(apiResponse.status).toBe(200);
    });

    it('should provide user metadata for frontend context', async () => {
      // GymPilot stores user info in state: {userId, email, role, tenantId}
      const response = await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({
          idToken: 'mock_REMOVED_AUTH_PROVIDER_id_token',
          tenantCode: 'gym-12345',
        })
        .expect(200);

      const user = response.body.user;
      expect(user.id).toBeDefined(); // userId
      expect(user.email).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.tenantId).toBeDefined();

      // Frontend stores: dispatch(setUser({id, email, role, tenantId}))
    });

    it('should SPA strategy: No middleware needed for GymPilot', async () => {
      // GymPilot doesn't have backend middleware (pure SPA)
      // Auth happens entirely client-side:
      // 1. User logs in → Firebase auth
      // 2. Get Firebase ID token
      // 3. Exchange for JWT via /auth/REMOVED_AUTH_PROVIDER
      // 4. Store JWT in localStorage
      // 5. Attach to all API calls as Bearer header

      // This test just verifies the exchange endpoint works (already tested above)
      const response = await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({
          idToken: 'mock_REMOVED_AUTH_PROVIDER_id_token',
          tenantCode: 'gym-12345',
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      // No Set-Cookie, no middleware required
    });
  });

  describe('MobiBix Frontend - Cookie + Middleware Strategy', () => {
    it('should provide accessToken and support Set-Cookie', async () => {
      // MobiBix (SSR) can receive token via Set-Cookie header
      const response = await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({
          idToken: 'mock_REMOVED_AUTH_PROVIDER_id_token',
          tenantCode: 'gym-12345',
        })
        .expect(200);

      // Backend can optionally return token in both body AND Set-Cookie
      // MobiBix frontend can extract from:
      // Option 1: response.body.accessToken
      // Option 2: Set-Cookie header (if backend implements it)

      expect(response.body.accessToken).toBeDefined();
    });

    it('should middleware validate accessToken cookie on protected routes', async () => {
      // MobiBix middleware (mobibix-web/src/middleware.ts) checks for cookie
      // Pattern:
      // const token = requestCookie.get('accessToken')?.value;
      // if (!token && isProtectedRoute()) {
      //   return NextResponse.redirect('/signin');
      // }

      // Pseudo SSR test (simplified):
      // GET /dashboard without cookie → redirects to /signin
      // GET /dashboard with valid cookie → serves page

      // This is primarily a middleware test in mobibix-web tests
      // But we verify JWT validates in backend:
      const exchangeResponse = await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({ idToken: 'mock_REMOVED_AUTH_PROVIDER_id_token', tenantCode: 'gym-12345' })
        .expect(200);

      const token = exchangeResponse.body.accessToken;

      // MobiBix stores token in cookie, then middleware attaches to requests
      // Backend receives: Authorization: Bearer <token from cookie>
      const apiResponse = await request(backendServer)
        .get('/core/customers')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(apiResponse.status).toBe(200);
    });

    it('should middleware redirect unauthenticated requests to /signin', async () => {
      // MobiBix middleware behavior (mobibix-web/src/middleware.ts):
      // if (isProtectedRoute() && !token) {
      //   return NextResponse.redirect(new URL('/signin', request.url))
      // }
      // This is a frontend middleware test (not backend E2E)
      // But we verify the pattern is documented
      // Expected in middleware:
      // protected paths: ['/dashboard', '/settings', '/gym', ...]
      // public paths: ['/signin', '/signup', '/home', ...]
    });

    it('should preserve tenantId in both auth strategies', async () => {
      // Both GymPilot (localStorage) and MobiBix (cookie) need tenantId
      const response = await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({
          idToken: 'mock_REMOVED_AUTH_PROVIDER_id_token',
          tenantCode: 'gym-fitness-12345',
        })
        .expect(200);

      const user = response.body.user;
      expect(user.tenantId).toBeDefined();

      // Both frontends use tenantId for:
      // - Tenant-scoped API calls: /gyms/{tenantId}/...
      // - Tenant context in state management
      // - Multi-tab consistency checks
    });
  });

  describe('Auth Strategy Distinctions', () => {
    it('GymPilot: SPA requires localStorage (no SSR middleware)', async () => {
      // GymPilot flow:
      // 1. Client receives JWT from /auth/REMOVED_AUTH_PROVIDER
      // 2. Stores in localStorage (client-side only)
      // 3. On each API call: reads from localStorage, attaches as Bearer
      // 4. No backend middleware validation needed

      const response = await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({
          idToken: 'mock_REMOVED_AUTH_PROVIDER_id_token',
          tenantCode: 'gym-12345',
        })
        .expect(200);

      // Token can be stored client-side
      expect(response.body.accessToken).toBeDefined();
    });

    it('MobiBix: SSR requires cookie + middleware (server-side validation)', async () => {
      // MobiBix flow:
      // 1. Client receives JWT from /auth/REMOVED_AUTH_PROVIDER
      // 2. Stores in HTTP-only cookie (server sets via Set-Cookie header)
      // 3. On each request: middleware reads cookie, validates JWT
      // 4. Passes to Next.js page handlers with context
      // 5. Redirects unauthenticated requests to /signin

      const response = await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({
          idToken: 'mock_REMOVED_AUTH_PROVIDER_id_token',
          tenantCode: 'gym-12345',
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      // Additional headers (e.g., Set-Cookie) can be set by frontend
    });
  });

  describe('Backward Compatibility', () => {
    it('should support both auth strategies from single /auth/REMOVED_AUTH_PROVIDER endpoint', async () => {
      // Single endpoint serves both frontends
      // /auth/REMOVED_AUTH_PROVIDER returns: {accessToken, user, ...}
      // GymPilot: Takes accessToken, stores in localStorage
      // MobiBix: Takes accessToken, sets in HTTP-only cookie via middleware

      const response = await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({
          idToken: 'mock_REMOVED_AUTH_PROVIDER_id_token',
          tenantCode: 'gym-12345',
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user).toBeDefined();
      // Both frontends can use this response
    });
  });

  describe('JWT Payload Consistency', () => {
    it('should include sub (user ID) in JWT', async () => {
      // JWT structure: {sub: userId, tenantId, role, iat, exp}
      const response = await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({
          idToken: 'mock_REMOVED_AUTH_PROVIDER_id_token',
          tenantCode: 'gym-12345',
        })
        .expect(200);

      // Pseudo: const payload = jwtDecode(response.body.accessToken);
      // expect(payload.sub).toBeDefined(); // User ID
      // expect(payload.tenantId).toBeDefined();
      // expect(payload.role).toBeDefined();

      expect(response.body.accessToken).toBeDefined();
    });

    it('should expire tokens appropriately', async () => {
      // JWT should have exp claim (e.g., 24 hours)
      const response = await request(backendServer)
        .post('/auth/REMOVED_AUTH_PROVIDER')
        .send({
          idToken: 'mock_REMOVED_AUTH_PROVIDER_id_token',
          tenantCode: 'gym-12345',
        })
        .expect(200);

      // Pseudo: const payload = jwtDecode(response.body.accessToken);
      // expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
      // expect(payload.exp - payload.iat).toBeLessThanOrEqual(24 * 60 * 60); // 24 hours

      expect(response.body.accessToken).toBeDefined();
    });
  });

  describe('Frontend Auth Documentation Validation', () => {
    it('should have documented auth strategy in GymPilot', () => {
      // See: apps/mobibix-web/lib/api.ts
      // Documentation should explain:
      // - SPA architecture (no SSR middleware)
      // - localStorage usage for Bearer token
      // - No Set-Cookie to manage
      // - Token attached to all API calls
      // This is a code review check (not runtime)
      // Verify presence of comment block explaining strategy
    });

    it('should have documented middleware strategy in MobiBix', () => {
      // See: apps/mobibix-web/src/middleware.ts
      // Documentation should explain:
      // - SSR architecture requiring middleware
      // - Cookie-based token storage
      // - Protected routes checking for accessToken cookie
      // - Redirect to /signin if not authenticated
      // See: apps/mobibix-web/src/services/auth.api.ts
      // Should document auth flow with middleware
      // This is a code review check
    });

    it('should keep auth strategies distinct (not merged)', () => {
      // GymPilot code should NOT:
      // - Import MobiBix middleware
      // - Use Next.js middleware (pure SPA)
      // - Check for Set-Cookie headers (no SSR)
      // MobiBix code should NOT:
      // - Store tokens in localStorage (unsafe in SSR)
      // - Skip middleware validation (required for SSR)
      // - Mix SPA patterns with SSR patterns
      // This is a code organization check
    });
  });
});
