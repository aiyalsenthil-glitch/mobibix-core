// apps/backend/src/REMOVED_AUTH_PROVIDERAdmin.ts
import * as admin from 'REMOVED_AUTH_PROVIDER-admin';
import fs from 'fs';

if (!admin.apps.length) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath || !fs.existsSync(credPath)) {
    throw new Error(
      'Missing GOOGLE_APPLICATION_CREDENTIALS env var or file not found: ' +
        String(credPath),
    );
  }

  const raw = fs.readFileSync(credPath, 'utf8');
  const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
