import * as admin from 'REMOVED_AUTH_PROVIDER-admin';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FirebaseAdminService {
  constructor() {
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
  }

  async verifyIdToken(token: string) {
    return admin.auth().verifyIdToken(token);
  }
}
