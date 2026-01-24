# MobiBix Frontend - Auth System Setup Guide

## Overview

The auth system is now fully integrated with:

- ✅ Firebase SDK initialization (`src/lib/REMOVED_AUTH_PROVIDER.ts`)
- ✅ Backend API service layer (`src/services/auth.api.ts`)
- ✅ React auth hook with context (`src/hooks/useAuth.ts`)
- ✅ Auth page with real Google login (`app/auth/page.tsx`)
- ✅ Auth provider wrapping the app (`app/layout.tsx`)

## Required Environment Variables

Create or update `.env.local` in the `apps/mobibix-web/` directory:

```env
# Firebase Configuration (from your Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=your_REMOVED_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.REMOVED_AUTH_PROVIDERapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_REMOVED_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost_REPLACED:3000/api
```

## Firebase Setup Steps

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.REMOVED_AUTH_PROVIDER.google.com/)
   - Click "Create a new project" or select existing
   - Follow the setup wizard

2. **Enable Google Authentication**:
   - Go to Authentication → Sign-in method
   - Enable "Google"
   - Add your app's domain to authorized domains

3. **Get Configuration Values**:
   - Go to Project Settings → Your apps → Web app
   - Copy the `REMOVED_AUTH_PROVIDERConfig` object values into `.env.local`

4. **Set Authorized Redirect URIs**:
   - Go to Authentication → Settings → Authorized domains
   - Add: `localhost` (for development)
   - Add your production domain

## Backend API Setup

Make sure your NestJS backend has:

1. **POST /auth/google/exchange** endpoint:
   - Accepts: `{ idToken: string, tenantCode?: string }`
   - Returns: `{ accessToken: string, user: {...}, tenant: {...} }`
   - Validates Firebase ID token
   - Creates/updates user in database
   - Issues JWT token

2. **Environment Variables** (on backend):
   - `GOOGLE_APPLICATION_CREDENTIALS` - path to Firebase service account JSON
   - `JWT_SECRET` - secret for signing JWTs
   - `JWT_EXPIRES_IN` - token expiration (e.g., "7d")

## How It Works

### Auth Flow

1. User clicks "Continue with Google" button
2. Firebase popup appears (Google OAuth)
3. User authenticates with Google
4. Firebase returns ID token
5. Frontend calls `exchangeToken(REMOVED_AUTH_PROVIDERUser)` hook method
6. Hook calls `signInWithPopup()` → gets Firebase user
7. Frontend extracts ID token via `getIdToken()`
8. Frontend calls `POST /auth/google/exchange` with ID token
9. Backend validates token, creates/updates user, issues JWT
10. Frontend stores JWT in localStorage
11. Frontend redirects to `/dashboard`
12. Dashboard loads user data from JWT

### Token Storage

- **Type**: JWT (not Firebase token)
- **Location**: `localStorage` (with `sessionStorage` fallback)
- **Key**: `auth_token`
- **Verified**: Checked for expiration before use
- **Sent**: In `Authorization: Bearer <token>` header to backend

### Protected Routes

Dashboard automatically redirects unauthenticated users:

- If `isAuthenticated = false` → redirect to `/auth`
- If `isAuthenticated = true` → show dashboard

## Files Created/Modified

### New Files

- `src/lib/REMOVED_AUTH_PROVIDER.ts` - Firebase SDK initialization
- `src/services/auth.api.ts` - Backend API service with token management
- `src/hooks/useAuth.ts` - React auth context and hook
- `AUTH_SETUP.md` - This file

### Modified Files

- `app/layout.tsx` - Added `<AuthProvider>` wrapper
- `app/auth/page.tsx` - Connected to real Google login
- `app/page.tsx` - Already has links to `/auth`

## Testing

1. **Development**:

   ```bash
   npm run dev
   # Opens on http://localhost_REPLACED:3000
   ```

2. **Test Flow**:
   - Go to home page (`/`)
   - Click "Sign In" or "Free Trial" button
   - You'll be redirected to `/auth`
   - Click "Continue with Google"
   - Firebase popup should appear
   - Sign in with Google account
   - Should redirect to `/dashboard` on success

3. **Check Token**:
   - Open DevTools → Application → LocalStorage
   - Look for key: `auth_token`
   - Should contain JWT (3 parts separated by dots)

4. **Verify Auth State**:
   - On dashboard, you should see your email and user info
   - Click "Logout" to clear token and return to home page

## Troubleshooting

### "Firebase configuration is invalid"

- Check `.env.local` has all required variables
- Make sure variables are correct from Firebase Console
- Restart dev server after changing .env

### "Failed to sign in with Google"

- Check Google auth is enabled in Firebase Console
- Verify `localhost` is in Authorized domains
- Clear browser cookies and cache
- Check browser console for error details

### "Failed to exchange token"

- Make sure backend is running on `http://localhost_REPLACED:3000`
- Check backend has `/auth/google/exchange` endpoint
- Verify Firebase Admin SDK is properly configured on backend
- Check backend logs for error details

### "Redirect to /dashboard but page is blank"

- Dashboard exists at `app/dashboard/page.tsx`
- Check browser console for errors
- Verify JWT token is in localStorage
- Try clearing localStorage and re-authenticating

## Next Steps

1. **Email/Password Auth** (Phase 2):
   - Add Firebase anonymous auth
   - Implement email sign-up flow
   - Add password reset logic

2. **Tenant Selection** (Phase 2):
   - If user has `tenantId = null`, show tenant creation/selection
   - Create new tenant or join existing via invite code
   - Store selected tenant in context

3. **Protected Routes** (Phase 3):
   - Add route protection middleware
   - Implement role-based access control
   - Add permission checks on API calls

4. **Session Management** (Phase 3):
   - Implement token refresh logic
   - Handle session expiration
   - Add "remember me" functionality

## Architecture Notes

### Why Separate Files?

- **`lib/REMOVED_AUTH_PROVIDER.ts`**: Centralized Firebase config (reusable)
- **`services/auth.api.ts`**: Backend API integration (no React deps)
- **`hooks/useAuth.ts`**: React state management (hooks + context)

This separation allows:

- ✅ Easy backend integration
- ✅ No tight coupling
- ✅ Type-safe API calls
- ✅ Reusable across components

### Security Considerations

- Never log Firebase tokens
- Always store backend JWT (not Firebase token)
- Validate token expiration before use
- Attach auth header to all API requests
- Clear token on logout
- Use HTTPS in production

## Support

If you encounter issues:

1. Check browser console for error messages
2. Check backend server logs
3. Verify all environment variables are set
4. Ensure Firebase and backend are running
5. Clear cache and restart dev server

---

**Status**: ✅ Production-Ready (Phase 1 - Google Auth)
