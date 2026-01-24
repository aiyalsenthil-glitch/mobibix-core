# MobiBix Auth System - Code Examples & Quick Reference

## Using Auth in Components

### Example 1: Simple Auth Check & Redirect

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedComponent() {
  const router = useRouter();
  const { isAuthenticated, isLoading, authUser } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;

  return (
    <div>
      <h1>Welcome, {authUser?.name}!</h1>
    </div>
  );
}
```

### Example 2: Display User Info

```tsx
import { useAuth } from "@/hooks/useAuth";

export function UserProfile() {
  const { authUser, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <div>
      <p>Email: {authUser?.email}</p>
      <p>Role: {authUser?.role}</p>
      <p>Tenant: {authUser?.tenantId || "Not assigned"}</p>
    </div>
  );
}
```

### Example 3: Make Authenticated API Calls

```tsx
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/services/auth.api";
import { useAuth } from "@/hooks/useAuth";

export function MyData() {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        const response = await authenticatedFetch("/gyms");
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  return <div>{JSON.stringify(data)}</div>;
}
```

### Example 4: Logout Button

```tsx
import { useAuth } from "@/hooks/useAuth";

export function LogoutButton() {
  const { logout } = useAuth();

  return (
    <button onClick={logout} className="btn btn-danger">
      Logout
    </button>
  );
}
```

## API Service Functions

### Token Management

```typescript
import {
  exchangeFirebaseToken, // Main: Firebase token → app JWT
  storeAccessToken, // Save JWT to storage
  getAccessToken, // Retrieve stored JWT
  clearAccessToken, // Remove JWT (logout)
  decodeAccessToken, // Parse JWT payload
  isAuthenticated, // Check if token valid + not expired
  getAuthHeader, // Get Authorization header
  authenticatedFetch, // Make authenticated API calls
} from "@/services/auth.api";

// Example: Exchange Firebase token
const response = await exchangeFirebaseToken(idToken, "optional-tenant-code");
console.log(response.user); // { id, email, name, role, tenantId }

// Example: Check if authenticated
if (isAuthenticated()) {
  const token = getAccessToken();
  console.log("User logged in, token:", token);
}

// Example: Decoded token content
const payload = decodeAccessToken(token);
console.log(payload); // { sub, tenantId, role, iat, exp }

// Example: API call
const response = await authenticatedFetch("/api/gyms");
const data = await response.json();

// Example: Get header for custom fetch
const headers = {
  ...getAuthHeader(),
  "Content-Type": "application/json",
};
```

## Firebase Functions

```typescript
import { auth, googleProvider } from "@/lib/REMOVED_AUTH_PROVIDER";
import { signInWithPopup, signOut } from "REMOVED_AUTH_PROVIDER/auth";

// Sign in with Google
const result = await signInWithPopup(auth, googleProvider);
console.log(result.user); // Firebase user object

// Get ID token
const idToken = await result.user.getIdToken();

// Sign out
await signOut(auth);
```

## Hook Usage in Components

```tsx
"use client";

import { useAuth } from "@/hooks/useAuth";

export default function AuthExample() {
  const {
    REMOVED_AUTH_PROVIDERUser, // Current Firebase user (or null)
    authUser, // App user from JWT (or null)
    isLoading, // True during auth operations
    isAuthenticated, // Boolean: user is authenticated
    error, // Error message (or null)
    logout, // Function to sign out
    exchangeToken, // Function to exchange Firebase→JWT
  } = useAuth();

  return (
    <div>
      <p>Loading: {isLoading ? "Yes" : "No"}</p>
      <p>Authenticated: {isAuthenticated ? "Yes" : "No"}</p>
      {error && <p>Error: {error}</p>}
      {authUser && <p>User: {authUser.email}</p>}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Type Definitions

```typescript
// App user (from JWT)
interface AuthUser {
  id: string;
  email: string;
  name?: string;
  REMOVED_AUTH_PROVIDERUid: string;
  role: "owner" | "staff" | "member";
  tenantId?: string;
}

// Exchange response
interface ExchangeTokenResponse {
  accessToken: string;
  user: AuthUser;
  tenant?: {
    id: string;
    code: string;
    name: string;
  };
}

// Error object
interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// JWT decoded payload
interface JwtPayload {
  sub: string; // User ID
  tenantId?: string; // Tenant ID (if staff)
  role: string; // User role
  iat: number; // Issued at (seconds)
  exp: number; // Expires at (seconds)
}
```

## Environment Setup

```bash
# apps/mobibix-web/.env.local

# Firebase configuration (from Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yourapp.REMOVED_AUTH_PROVIDERapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef...

# Backend API
NEXT_PUBLIC_API_URL=http://localhost_REPLACED:3000/api
```

## Common Patterns

### Pattern 1: Protected Page with Loading

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    router.push("/auth");
    return null;
  }

  return <YourContent />;
}
```

### Pattern 2: Conditional Rendering by Role

```tsx
import { useAuth } from "@/hooks/useAuth";

export function AdminFeature() {
  const { authUser } = useAuth();

  if (authUser?.role !== "owner") {
    return <p>Admin access only</p>;
  }

  return <AdminPanel />;
}
```

### Pattern 3: Tenant-Specific Content

```tsx
import { useAuth } from "@/hooks/useAuth";

export function TenantSelector() {
  const { authUser } = useAuth();

  const hasNoTenant = !authUser?.tenantId;

  if (hasNoTenant) {
    return <CreateOrJoinTenantFlow />;
  }

  return <TenantContent tenantId={authUser.tenantId} />;
}
```

### Pattern 4: Logout with Redirect

```tsx
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function LogoutWithRedirect() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

## Backend API Patterns

### Pattern 1: Fetch with Automatic Auth

```typescript
// This automatically adds Authorization header
const response = await authenticatedFetch("/api/gyms");
const data = await response.json();
```

### Pattern 2: POST with Auth

```typescript
const response = await authenticatedFetch("/api/gyms", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "My Gym",
  }),
});
const result = await response.json();
```

### Pattern 3: Error Handling

```typescript
import { authenticatedFetch } from "@/services/auth.api";

try {
  const response = await authenticatedFetch("/api/gyms");

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error("Failed to fetch gyms:", error);
  // Handle error (redirect to login, show message, etc.)
}
```

## Debugging

### Check If User is Authenticated

```typescript
import {
  isAuthenticated,
  getAccessToken,
  decodeAccessToken,
} from "@/services/auth.api";

console.log("Is auth:", isAuthenticated()); // true/false
console.log("Token:", getAccessToken()); // JWT string
console.log("Decoded:", decodeAccessToken()); // JWT payload
```

### Check localStorage

```javascript
// In browser DevTools console
localStorage.getItem("auth_token"); // Get JWT
sessionStorage.getItem("auth_token"); // Fallback
```

### Monitor Auth State Changes

```tsx
"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export function AuthMonitor() {
  const { authUser, isAuthenticated, isLoading, error } = useAuth();

  useEffect(() => {
    console.log("Auth state:", {
      isAuthenticated,
      isLoading,
      authUser,
      error,
    });
  }, [authUser, isAuthenticated, isLoading, error]);

  return null;
}
```

## Common Errors & Fixes

### Error: "Cannot find module '@/hooks/useAuth'"

**Fix**: Make sure:

1. `src/hooks/useAuth.ts` exists
2. `tsconfig.json` has path alias: `"@/*": ["./src/*"]`
3. Restart dev server

### Error: "useAuth must be used within AuthProvider"

**Fix**: Make sure `<AuthProvider>` wraps your component in `app/layout.tsx`

### Error: "Token expired"

**Fix**: Token is checked on access. Either:

1. User needs to re-login
2. Implement token refresh (Phase 2)

### Error: "Failed to exchange token"

**Fix**: Check:

1. Backend is running on correct URL
2. `/auth/google/exchange` endpoint exists
3. Firebase Admin SDK properly configured
4. Network request in DevTools for error details

## Next Features (Phase 2)

```tsx
// Email/Password Sign Up
const handleEmailSignUp = async (email: string, password: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await exchangeToken(result.user);
};

// Tenant Creation
const createTenant = async (name: string) => {
  const response = await authenticatedFetch("/api/tenants", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return response.json();
};

// Token Refresh
const refreshToken = async () => {
  const newToken = await auth.currentUser?.getIdToken(true);
  await exchangeFirebaseToken(newToken);
};
```

---

**Last Updated**: 2025
**Status**: Production Ready (Phase 1)
