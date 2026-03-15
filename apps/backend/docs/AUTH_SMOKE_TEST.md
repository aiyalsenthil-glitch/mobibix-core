# Auth Flow Smoke Test Instructions

## Automated Test (requires existing session)

1. **Login via frontend** (get cookies set by browser)

2. **Extract cookies from browser DevTools:**

   ```javascript
   document.cookie;
   ```

   Look for:
   - `accessToken=xxxx`
   - `refreshToken=yyyy`
   - `csrfToken=zzzz`

3. **Set environment variables:**

   ```powershell
   $env:TEST_ACCESS_TOKEN='<paste-accessToken-value>'
   $env:TEST_REFRESH_TOKEN='<paste-refreshToken-value>'
   $env:TEST_CSRF_TOKEN='<paste-csrfToken-value>'
   ```

4. **Run the test:**
   ```bash
   cd apps/backend
   npx ts-node -r dotenv/config src/scripts/test-auth-flow.ts
   ```

## Manual Test (Postman/Insomnia)

### 1. GET /users/me (Cookie Auth)

```
GET http://localhost_REPLACED:3000/api/users/me
Headers:
  Cookie: accessToken=<value>; refreshToken=<value>; csrfToken=<value>
```

**Expected:** 200 OK with user data

### 2. PATCH /users/me (CSRF Protected)

```
PATCH http://localhost_REPLACED:3000/api/users/me
Headers:
  Cookie: accessToken=<value>; refreshToken=<value>; csrfToken=<value>
  X-CSRF-Token: <csrfToken-value>
  Content-Type: application/json
Body:
  { "fullName": "Test User" }
```

**Expected:** 200 OK

### 3. PATCH /users/me (No CSRF - should fail)

```
PATCH http://localhost_REPLACED:3000/api/users/me
Headers:
  Cookie: accessToken=<value>; refreshToken=<value>; csrfToken=<value>
  Content-Type: application/json
Body:
  { "fullName": "Should Fail" }
```

**Expected:** 403 Forbidden (CSRF token missing)

### 4. POST /auth/refresh

```
POST http://localhost_REPLACED:3000/api/auth/refresh
Headers:
  Cookie: accessToken=<value>; refreshToken=<value>; csrfToken=<value>
  X-CSRF-Token: <csrfToken-value>
  Content-Type: application/json
```

**Expected:** 200 OK with new `Set-Cookie` headers

### 5. POST /auth/logout

```
POST http://localhost_REPLACED:3000/api/auth/logout
Headers:
  Cookie: accessToken=<value>; refreshToken=<value>; csrfToken=<value>
  X-CSRF-Token: <csrfToken-value>
  Content-Type: application/json
```

**Expected:** 200 OK with `Set-Cookie: ... Max-Age=0` headers

## Frontend Test (Browser Console)

1. **Login** via frontend UI

2. **Check cookies:**

   ```javascript
   document.cookie;
   ```

   Should see: `csrfToken=...` (readable, non-httpOnly)

3. **Test authenticated fetch:**

   ```javascript
   const response = await fetch('http://localhost_REPLACED:3000/api/users/me', {
     credentials: 'include',
   });
   const user = await response.json();
   console.log(user);
   ```

4. **Test CSRF header:**

   ```javascript
   const csrfToken = document.cookie.match(/csrfToken=([^;]+)/)?.[1];

   const response = await fetch('http://localhost_REPLACED:3000/api/users/me', {
     method: 'PATCH',
     credentials: 'include',
     headers: {
       'Content-Type': 'application/json',
       'X-CSRF-Token': csrfToken,
     },
     body: JSON.stringify({ fullName: 'Browser Test' }),
   });

   console.log(response.status); // Should be 200
   ```

5. **Test logout:**

   ```javascript
   const csrfToken = document.cookie.match(/csrfToken=([^;]+)/)?.[1];

   await fetch('http://localhost_REPLACED:3000/api/auth/logout', {
     method: 'POST',
     credentials: 'include',
     headers: {
       'Content-Type': 'application/json',
       'X-CSRF-Token': csrfToken,
     },
   });

   // Check cookies cleared
   console.log(document.cookie);
   ```

## Checklist

- [ ] httpOnly cookies set on login ✅
- [ ] csrfToken readable from JavaScript ✅
- [ ] Cookie-based auth works on /users/me ✅
- [ ] CSRF header required for POST/PATCH/DELETE ✅
- [ ] Missing CSRF header returns 403 ✅
- [ ] Token refresh works with cookies ✅
- [ ] Logout clears all cookies ✅
- [ ] Frontend authenticatedFetch uses cookies ✅
- [ ] Frontend getCurrentUser works ✅

## Expected Results

All tests should pass. If any fail, check:

- Backend has `cookie-parser` installed
- CORS `credentials: true` is enabled
- Frontend uses `credentials: 'include'`
- CSRF token is sent in `X-CSRF-Token` header for mutating requests
