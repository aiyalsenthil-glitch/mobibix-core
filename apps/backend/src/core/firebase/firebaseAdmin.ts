import * as admin from 'REMOVED_AUTH_PROVIDER-admin';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FirebaseAdminService {
  constructor() {
    if (!admin.apps.length) {
      const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

      if (!base64) {
        throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_BASE64 env var');
      }

      // Decode base64 → JSON
      const json = Buffer.from(base64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(json);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log('🔥 Firebase Admin initialized:', admin.apps.length);
    }
  }

  async verifyIdToken(token: string) {
    return admin.auth().verifyIdToken(token);
  }
}
