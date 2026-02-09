# 🚀 MobiBix Frontend Auth - Getting Started Checklist

## ⚡ Quick Start (5 minutes)

### Step 1: Install Firebase (1 minute)

```bash
cd apps/mobibix-web
npm install REMOVED_AUTH_PROVIDER
```

### Step 2: Get Firebase Credentials (3 minutes)

1. Go to [Firebase Console](https://console.REMOVED_AUTH_PROVIDER.google.com/)
2. Create or select project
3. Go to Project Settings → Your apps
4. Copy credentials

### Step 3: Setup Environment File (1 minute)

Create `apps/mobibix-web/.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.REMOVED_AUTH_PROVIDERapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
NEXT_PUBLIC_API_URL=http://localhost_REPLACED:3000/api
```

### Step 4: Start Development

```bash
npm run dev
# Opens http://localhost_REPLACED:3000
```

### Step 5: Test Auth Flow

1. Click "Sign In" button
2. Click "Continue with Google"
3. Authenticate with your Google account
4. Should redirect to /dashboard

✅ **Done!** Basic auth is working

---

## 📋 Complete Setup Checklist

### Pre-Setup (Read First)

- [ ] Read `AUTH_SETUP.md` (detailed guide)
- [ ] Read `IMPLEMENTATION_SUMMARY.md` (architecture overview)
- [ ] Review `FILE_LISTING.md` (what was created)

### Firebase Console Setup

#### Project Creation

- [ ] Have a Firebase project (create at console.REMOVED_AUTH_PROVIDER.google.com)
- [ ] Note the Project ID
- [ ] Enabled Google auth in Firebase Console

#### Get Credentials

- [ ] Open Firebase Console → Project Settings
- [ ] Click "Your apps" section
- [ ] Copy values for:
  - API Key → `NEXT_PUBLIC_FIREBASE_API_KEY`
  - Auth Domain → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - Project ID → `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - Storage Bucket → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - Messaging Sender ID → `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - App ID → `NEXT_PUBLIC_FIREBASE_APP_ID`

#### Configure Google Auth

- [ ] Go to Authentication → Sign-in method
- [ ] Enable Google
- [ ] Go to Authentication → Settings
- [ ] Add authorized domain: `localhost`
- [ ] Add authorized domain: `yourdomain.com` (for production)

### Frontend Setup

#### Dependencies

- [ ] Run `npm install REMOVED_AUTH_PROVIDER`
- [ ] Verify installation: `npm list REMOVED_AUTH_PROVIDER`

#### Environment

- [ ] Create `.env.local` file in `apps/mobibix-web/`
- [ ] Fill in all 7 Firebase variables
- [ ] Set `NEXT_PUBLIC_API_URL=http://localhost_REPLACED:3000/api`
- [ ] Verify no typos

#### Code Files

- [ ] Verify `src/lib/REMOVED_AUTH_PROVIDER.ts` exists
- [ ] Verify `src/services/auth.api.ts` exists
- [ ] Verify `src/hooks/useAuth.ts` exists
- [ ] Verify `app/layout.tsx` has `<AuthProvider>`
- [ ] Verify `app/auth/page.tsx` has real Google login

#### Development

- [ ] Run `npm run dev`
- [ ] No errors in terminal
- [ ] Navigate to http://localhost_REPLACED:3000
- [ ] Page loads correctly

### Backend Setup (Prerequisite)

#### Database

- [ ] PostgreSQL running
- [ ] Database created
- [ ] Prisma migrations applied
- [ ] User and Tenant models in schema

#### Firebase Admin

- [ ] Firebase service account JSON downloaded
- [ ] Path set in `GOOGLE_APPLICATION_CREDENTIALS`
- [ ] Admin SDK initialized in backend

#### Auth Endpoint

- [ ] `POST /auth/google/exchange` endpoint exists
- [ ] Accepts: `{ idToken, tenantCode? }`
- [ ] Returns: `{ accessToken, user, tenant }`
- [ ] Backend running on `http://localhost_REPLACED:3000`

#### CORS

- [ ] CORS enabled for `http://localhost_REPLACED:3000` (frontend)
- [ ] Allow credentials: true
- [ ] Methods: GET, POST, PUT, DELETE
- [ ] Headers: Content-Type, Authorization

### Manual Testing

#### Test 1: Home Page

- [ ] Go to http://localhost_REPLACED:3000
- [ ] Page loads
- [ ] Theme toggle works
- [ ] "Sign In" button visible
- [ ] "Free Trial" button visible

#### Test 2: Auth Page

- [ ] Click "Sign In"
- [ ] Redirected to /auth
- [ ] Google sign-in button visible
- [ ] Email/password form visible
- [ ] No JavaScript errors

#### Test 3: Google Sign-In

- [ ] Click "Continue with Google"
- [ ] Google popup appears
- [ ] Can authenticate
- [ ] No console errors

#### Test 4: Token Exchange

- [ ] Check DevTools → Network → /auth/google/exchange
- [ ] Status: 200
- [ ] Response includes: accessToken, user, tenant
- [ ] No errors in response

#### Test 5: Dashboard

- [ ] Redirected to /dashboard
- [ ] Dashboard loads
- [ ] User email displayed
- [ ] User role displayed
- [ ] No errors

#### Test 6: Token Storage

- [ ] Open DevTools → Application → LocalStorage
- [ ] Key: `auth_token`
- [ ] Value: JWT (3 parts with dots)
- [ ] Refresh page (F5)
- [ ] Token still exists
- [ ] User still logged in

#### Test 7: Logout

- [ ] Click "Logout" on dashboard
- [ ] Redirected to home page
- [ ] `auth_token` removed from localStorage
- [ ] User not authenticated

#### Test 8: Protected Routes

- [ ] Logout completely
- [ ] Try to access /dashboard directly
- [ ] Redirected to /auth
- [ ] Login again
- [ ] Access /dashboard
- [ ] Loads successfully

#### Test 9: Multiple Tabs

- [ ] Open auth page in Tab A
- [ ] Sign in with Google
- [ ] Open http://localhost_REPLACED:3000 in Tab B
- [ ] Tab B should also show as authenticated (same browser)
- [ ] Both tabs see same user

#### Test 10: Error Handling

- [ ] Stop backend server
- [ ] Try to sign in
- [ ] Should show error message
- [ ] Message is helpful
- [ ] App doesn't crash
- [ ] Restart backend
- [ ] Sign in works again

### Browser DevTools Checks

#### Network Tab

- [ ] POST /auth/google/exchange shows 200 status
- [ ] Response has accessToken field
- [ ] No 401/403 errors

#### Console Tab

- [ ] No red errors
- [ ] Firebase initialization successful message (if any)
- [ ] No warnings (or only non-critical)

#### Application Tab

- [ ] LocalStorage has `auth_token`
- [ ] SessionStorage has `auth_token` (fallback)
- [ ] No errors in Storage

#### Elements Tab

- [ ] DOM loads correctly
- [ ] No missing imports
- [ ] CSS styles applied

### Production Preparation

#### Code Quality

- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] No errors in build output
- [ ] Build completes in <5 minutes

#### Security

- [ ] No Firebase token in localStorage
- [ ] Only JWT stored
- [ ] HTTPS enabled (for production)
- [ ] CSP headers configured
- [ ] CORS properly restricted

#### Performance

- [ ] Page loads in <3 seconds
- [ ] Auth page interactive in <2 seconds
- [ ] No memory leaks
- [ ] Lighthouse score >80

#### Documentation

- [ ] All docs are up to date
- [ ] Examples work as written
- [ ] Setup guide is clear
- [ ] Troubleshooting covers known issues

---

## 🆘 Troubleshooting

### "Cannot find module '@/hooks/useAuth'"

```bash
# Check file exists
ls -la src/hooks/useAuth.ts

# Restart dev server
npm run dev
```

### "useAuth must be used within AuthProvider"

- Check `app/layout.tsx` has `<AuthProvider>`
- Check import: `import { AuthProvider } from "@/hooks/useAuth";`
- Restart dev server

### "Firebase configuration is invalid"

- Check `.env.local` exists
- Check all 7 Firebase variables are set
- No spaces around `=`
- No quotes around values
- Restart dev server

### "Failed to sign in with Google"

- Check Firebase Console has Google auth enabled
- Check `localhost` is in Authorized domains
- Check browser cookies aren't blocking
- Try incognito/private window

### "Failed to exchange token"

- Check backend is running: http://localhost_REPLACED:3000
- Check endpoint exists: POST /auth/google/exchange
- Check backend logs for error details
- Verify Firebase Admin SDK is configured on backend

### "Blank dashboard after login"

- Check browser console for JavaScript errors
- Check localStorage has `auth_token`
- Check Network tab for failed requests
- Check backend logs for errors

### "Token in localStorage but not authenticated"

- Open DevTools → Console
- Run: `localStorage.getItem('auth_token')`
- Should return JWT (3 parts with dots)
- If null, token didn't store properly
- Check `storeAccessToken()` is being called

---

## 📚 Documentation Map

| Need Help With      | Read This                                 |
| ------------------- | ----------------------------------------- |
| Setting up          | `AUTH_SETUP.md`                           |
| How it works        | `IMPLEMENTATION_SUMMARY.md`               |
| Code examples       | `CODE_EXAMPLES.md`                        |
| Testing             | `VERIFICATION.md`                         |
| Backend integration | `BACKEND_INTEGRATION.md`                  |
| File list           | `FILE_LISTING.md`                         |
| Debugging           | `AUTH_SETUP.md` → Troubleshooting section |

---

## 🎯 Success Criteria

✅ You've successfully set up MobiBix frontend auth when:

1. **Home Page Loads**
   - http://localhost_REPLACED:3000 opens
   - Header visible with MobiBix logo
   - Sign In and Free Trial buttons functional

2. **Auth Flow Works**
   - Click Sign In → goes to /auth
   - Click Google button → Firebase popup appears
   - Can authenticate with Google account

3. **Token Exchange Works**
   - After Google auth, frontend calls backend
   - Backend returns JWT token
   - No 401/403 errors

4. **Dashboard Shows**
   - Automatically redirected to /dashboard
   - Shows user email from JWT
   - Shows user role (owner/staff/member)
   - Logout button functional

5. **Token Persists**
   - Check DevTools → LocalStorage
   - Key `auth_token` exists
   - Value is valid JWT
   - Survives page refresh

6. **Protected Routes Work**
   - Logout completely
   - Try to access /dashboard directly
   - Redirected to /auth automatically
   - Sign back in → dashboard accessible

---

## 🚀 Next Steps

### Immediate (This Week)

- [ ] Complete all checklist items above
- [ ] Test E2E flow 5-10 times
- [ ] Document any issues found
- [ ] Get team feedback

### Soon (Next Week)

- [ ] Add email/password authentication (Phase 2)
- [ ] Implement tenant selection (Phase 2)
- [ ] Add staff invite handling (Phase 2)

### Later (Month 2)

- [ ] Token refresh logic (Phase 3)
- [ ] Protected route middleware (Phase 3)
- [ ] Role-based access control (Phase 3)

---

## 📞 Getting Help

### Common Questions

**Q: Where do I get Firebase credentials?**
A: Firebase Console → Project Settings → Your apps

**Q: Why is my token not being stored?**
A: Check `.env.local` is configured, restart dev server

**Q: How do I test without backend?**
A: Can't - backend is required for token exchange

**Q: Can I use this with email/password?**
A: Not yet - Phase 2 will add that

**Q: How do I deploy this?**
A: Set production Firebase credentials and API URL

### Getting Technical Help

1. Check browser console for error messages
2. Check backend logs for API errors
3. Verify all environment variables are set
4. Read troubleshooting section in `AUTH_SETUP.md`
5. Check code comments in source files

---

## 📊 Completion Tracker

- [ ] Firebase installed
- [ ] .env.local created with credentials
- [ ] Frontend dependencies resolved
- [ ] Development server running
- [ ] Home page loads
- [ ] Auth page loads
- [ ] Google sign-in works
- [ ] Token exchange succeeds
- [ ] Dashboard displays user info
- [ ] Token persisted in localStorage
- [ ] Logout clears token
- [ ] Protected routes redirect correctly
- [ ] All 10 tests passing
- [ ] Ready for Phase 2

---

## 🎓 Learning Resources

### Firebase Documentation

- [Firebase Auth Docs](https://REMOVED_AUTH_PROVIDER.google.com/docs/auth)
- [Google Sign-In Guide](https://developers.google.com/identity/sign-in)

### Next.js Documentation

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Auth Patterns](https://nextjs.org/docs/app/building-your-application/authentication)

### React Documentation

- [React Context API](https://react.dev/reference/react/useContext)
- [React Hooks](https://react.dev/reference/react)

### JWT Documentation

- [JWT.io](https://jwt.io/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Ready to get started? Follow the Quick Start above! 🚀**

**Status**: ✅ Production Ready | **Phase**: 1 of 5
