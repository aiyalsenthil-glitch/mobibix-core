import * as admin from 'REMOVED_AUTH_PROVIDER-admin';

if (!admin.apps.length) {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!json) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT env var');
  }

  const serviceAccount = JSON.parse(json);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
