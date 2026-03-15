# MobiBix Frontend ↔ Backend Integration Guide

## Overview

This document shows how the MobiBix frontend auth system integrates with the NestJS backend at `apps/backend/`.

## Integration Points

### Frontend → Backend Communication

```
Frontend                          Backend
========                          =======

useAuth() hook
    ↓
exchangeFirebaseToken()
    ↓
POST /auth/google/exchange ──────→ AuthController.exchangeToken()
(with idToken)                      ↓
                                 AuthService.verifyFirebaseIdToken()
                                    ↓
                                 Firebase Admin SDK.verifyIdToken()
                                    ↓
                                 AuthService.findOrCreateUser()
                                    ↓
                                 Prisma.user.upsert()
                                    ↓
                                 AuthService.createBackendToken()
                                    ↓
                          JWT signed with JWT_SECRET
                                    ↓
                          Response: accessToken + user + tenant
                                    ↓
← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
Frontend receives response
    ↓
storeAccessToken(accessToken)
    ↓
localStorage['auth_token'] = JWT
    ↓
Component renders with authUser data
```

## Endpoint Specification

### POST /auth/google/exchange

**Purpose**: Convert Firebase ID token to app JWT

**Request**:

```json
{
  "idToken": "REMOVED_AUTH_PROVIDER_id_token_from_client",
  "tenantCode": "gym-name-12345" // optional
}
```

**Response (200)**:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx1y2z3abc4def5ghi6jkl7",
    "email": "user@example.com",
    "name": "John Doe",
    "REMOVED_AUTH_PROVIDERUid": "REMOVED_AUTH_PROVIDER_uid_123",
    "role": "owner",
    "tenantId": null
  },
  "tenant": null
}
```

**Response (401)**:

```json
{
  "statusCode": 401,
  "message": "Invalid Firebase token",
  "error": "Unauthorized"
}
```

## Backend Implementation (Reference)

### Auth Controller

```typescript
// apps/backend/src/core/auth/auth.controller.ts

@Post('google/exchange')
@HttpCode(200)
async exchangeToken(
  @Body() dto: ExchangeDto,
): Promise<ExchangeTokenResponse> {
  // Verify Firebase token
  const decodedToken = await this.authService.verifyFirebaseIdToken(
    dto.idToken,
  );

  // Find or create user
  const user = await this.authService.findOrCreateUser(
    decodedToken.uid,
    decodedToken.email,
    decodedToken.name,
    dto.tenantCode,  // Optional tenant resolution
  );

  // Create backend JWT
  const accessToken = this.authService.createBackendToken({
    sub: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });

  return {
    accessToken,
    user,
    tenant: user.tenantId ? /* fetch tenant */ : null,
  };
}
```

### Auth Service

```typescript
// apps/backend/src/core/auth/auth.service.ts

async verifyFirebaseIdToken(idToken: string) {
  try {
    return await this.REMOVED_AUTH_PROVIDERAdmin.auth().verifyIdToken(idToken);
  } catch (err) {
    throw new UnauthorizedException('Invalid Firebase token');
  }
}

async findOrCreateUser(
  REMOVED_AUTH_PROVIDERUid: string,
  email: string,
  name: string,
  tenantCode?: string,
) {
  // Resolve tenant by code if provided
  let tenantId: string | null = null;
  if (tenantCode) {
    const tenant = await prisma.tenant.findUnique({
      where: { code: tenantCode },
    });
    if (tenant) {
      tenantId = tenant.id;
    }
  }

  // Upsert user (idempotent on REMOVED_AUTH_PROVIDERUid)
  return await prisma.user.upsert({
    where: { REMOVED_AUTH_PROVIDERUid },
    create: {
      REMOVED_AUTH_PROVIDERUid,
      email,
      name,
      role: 'owner',  // Default role
      tenantId,
    },
    update: {
      name,
      tenantId,
    },
  });
}

createBackendToken(payload: JwtPayload): string {
  return this.jwtService.sign(payload, {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}
```

### Database Schema (Prisma)

```prisma
// apps/backend/prisma/schema.prisma

model Tenant {
  id    String  @id @default(cuid())
  code  String  @unique  // e.g., "gym-name-12345"
  name  String
  users User[]
  members Member[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model User {
  id          String    @id @default(cuid())
  email       String    @unique
  REMOVED_AUTH_PROVIDERUid String    @unique
  name        String?

  role      String    @default("member")  // "owner" | "staff" | "member"
  tenantId  String?   @db.String         // Optional FK
  tenant    Tenant?   @relation(fields: [tenantId], references: [id])

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Member {
  id        String  @id @default(cuid())
  name      String
  email     String
  phone     String?

  tenantId  String
  tenant    Tenant  @relation(fields: [tenantId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([tenantId, email])
}
```

## Frontend API Service Usage

### How Frontend Makes Authenticated Calls

```typescript
// Frontend code
import { authenticatedFetch } from "@/services/auth.api";

// Automatic Authorization header injection
const response = await authenticatedFetch("/api/gyms");
// Equivalent to:
// fetch('/api/gyms', {
//   headers: {
//     'Authorization': 'Bearer eyJhbGc...'
//   }
// })
```

### Backend Authorization

```typescript
// apps/backend/src/core/auth/jwt-auth.guard.ts

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("No token provided");
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      request.user = this.validateJwtPayload(payload);
    } catch {
      throw new UnauthorizedException("Invalid token");
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const auth = request.headers.authorization;
    return auth?.replace("Bearer ", "");
  }
}
```

## Token Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Authentication Flow                     │
└─────────────────────────────────────────────────────────────────┘

CLIENT SIDE (MobiBix Frontend)          SERVER SIDE (NestJS Backend)
═══════════════════════════════════════════════════════════════════

User clicks "Sign In"
    │
    ├─→ Firebase popup
    │       │
    │       ├─→ User authenticates with Google
    │       │
    │       └─→ Firebase returns ID token + user object
    │
    ├─→ exchangeFirebaseToken(idToken)
    │       │
    │       ├─→ POST /auth/google/exchange
    │       │   ├─→ { idToken, tenantCode? }
    │       │        │
    │       │        └─────────────────→ AuthController
    │       │                              │
    │       │                              ├─→ verifyIdToken()
    │       │                              │   └─→ Firebase Admin SDK
    │       │                              │
    │       │                              ├─→ findOrCreateUser()
    │       │                              │   └─→ Prisma.user.upsert()
    │       │                              │
    │       │                              ├─→ createBackendToken()
    │       │                              │   └─→ JWT signed
    │       │                              │
    │       │                              └─→ Response:
    │       │                                  {
    │       │                                    accessToken: "...",
    │       │                                    user: {...},
    │       │                                    tenant: {...}
    │       │                                  }
    │       │
    │       └─← Response
    │
    ├─→ storeAccessToken(accessToken)
    │   └─→ localStorage['auth_token'] = JWT
    │
    ├─→ Update authUser state
    │
    └─→ Redirect to /dashboard
```

## Making Authenticated API Calls

### From Frontend

```typescript
// Frontend: src/services/auth.api.ts
export async function authenticatedFetch(
  endpoint: string,
  options?: RequestInit,
): Promise<Response> {
  const headers = {
    ...getAuthHeader(), // Adds: { Authorization: "Bearer <token>" }
    ...options?.headers,
  };

  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

// Usage in component
const response = await authenticatedFetch("/gyms");
const data = await response.json();
```

### From Backend

```typescript
// Backend: any protected route

@Get('gyms')
@UseGuards(JwtAuthGuard)
async getGyms(@Request() req) {
  // req.user is set by JwtAuthGuard
  const userId = req.user.sub;
  const tenantId = req.user.tenantId;

  return this.gymsService.findByTenant(tenantId);
}
```

## Environment Variables Mapping

### Frontend (.env.local)

```env
# Firebase - from Firebase Console
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Backend API endpoint
NEXT_PUBLIC_API_URL=http://localhost_REPLACED:3000/api
```

### Backend (.env)

```env
# Firebase - Service Account
GOOGLE_APPLICATION_CREDENTIALS=/path/to/REMOVED_AUTH_PROVIDER-service-account.json

# JWT - From environment
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://...

# CORS - Allow frontend domain
CORS_ORIGIN=http://localhost_REPLACED:3000
```

## Error Handling

### Frontend Error Handling

```typescript
// In useAuth hook
try {
  await exchangeToken(REMOVED_AUTH_PROVIDERUser);
} catch (err) {
  // err.message contains backend error message
  setError(err.message);
}
```

### Backend Error Responses

```typescript
// Invalid token
{
  "statusCode": 401,
  "message": "Invalid Firebase token",
  "error": "Unauthorized"
}

// Missing token in request
{
  "statusCode": 401,
  "message": "No token provided",
  "error": "Unauthorized"
}

// Expired token
{
  "statusCode": 401,
  "message": "Invalid token",
  "error": "Unauthorized"
}

// Server error
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "InternalServerError"
}
```

## Security Best Practices

### Frontend Security

- ✅ Never store Firebase token
- ✅ Only store backend JWT
- ✅ Validate token expiration
- ✅ Include auth header on protected requests
- ✅ Clear token on logout

### Backend Security

- ✅ Verify Firebase ID token with Admin SDK
- ✅ Check token signature and expiration
- ✅ Use JwtAuthGuard on protected routes
- ✅ Validate JWT_SECRET in environment
- ✅ Log authentication events
- ✅ Implement rate limiting on auth endpoints

## Testing the Integration

### Step 1: Start Backend

```bash
cd apps/backend
npm run start:dev
# Should run on http://localhost_REPLACED:3000
```

### Step 2: Start Frontend

```bash
cd apps/mobibix-web
npm run dev
# Should run on http://localhost_REPLACED:3001
```

### Step 3: Test Flow

```bash
1. Go to http://localhost_REPLACED:3000
2. Click "Sign In"
3. Click "Continue with Google"
4. Authenticate with Google
5. Check backend logs for POST /auth/google/exchange
6. Should redirect to /dashboard
7. Open DevTools → Application → LocalStorage
8. Should see 'auth_token' with JWT value
```

### Step 4: Test Protected Route

```bash
# In browser console
const response = await authenticatedFetch('/api/some-protected-endpoint');
const data = await response.json();
console.log(data);
```

## Debugging Checklist

### Frontend

- [ ] Check `.env.local` has all Firebase variables
- [ ] Check `npm run dev` runs without errors
- [ ] Open DevTools → Network → Google sign-in request succeeds
- [ ] Check Network tab for POST /auth/google/exchange call
- [ ] Check Response has accessToken
- [ ] Check localStorage has auth_token
- [ ] Check Console for JavaScript errors

### Backend

- [ ] Check backend is running on http://localhost_REPLACED:3000
- [ ] Check POST /auth/google/exchange endpoint exists
- [ ] Check backend logs for incoming requests
- [ ] Check Firebase Admin SDK initialization
- [ ] Verify JWT_SECRET is set
- [ ] Check database connection works
- [ ] Check CORS is properly configured

## Deployment Considerations

### Frontend Deployment

- [ ] Set production Firebase credentials
- [ ] Set production API_URL
- [ ] Build succeeds: `npm run build`
- [ ] Test locally before deploying

### Backend Deployment

- [ ] Set production environment variables
- [ ] Set production JWT_SECRET
- [ ] Update CORS_ORIGIN to production domain
- [ ] Configure Firebase service account
- [ ] Set up database backups
- [ ] Enable HTTPS everywhere

## API Reference

### Frontend Services

**`src/services/auth.api.ts`**:

- `exchangeFirebaseToken(idToken, tenantCode?)`
- `storeAccessToken(token)`
- `getAccessToken()`
- `clearAccessToken()`
- `decodeAccessToken(token)`
- `isAuthenticated()`
- `getAuthHeader()`
- `authenticatedFetch(endpoint, options)`

### Backend Endpoints

**Authentication**:

- `POST /auth/google/exchange` - Exchange Firebase token for JWT
- `POST /auth/logout` - Invalidate token (optional)
- `GET /auth/me` - Get current user (optional)

---

**Integration Status**: ✅ Ready for Development

**Next Phase**: Add more endpoints as needed, implement tenant management, add role-based access control
