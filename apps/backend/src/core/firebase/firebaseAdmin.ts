import * as admin from 'REMOVED_AUTH_PROVIDER-admin';
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseAdminService {
  constructor() {
    if (!admin.apps.length) {
      // Try loading from environment variable first (for production)
      let serviceAccount: any;
      const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

      if (base64) {
        // Decode base64 → JSON
        const json = Buffer.from(base64, 'base64').toString('utf8');
        serviceAccount = JSON.parse(json);
      } else {
        // Fall back to reading from file (for development)
        const credPath =
          process.env.GOOGLE_APPLICATION_CREDENTIALS ||
          path.join(__dirname, '../../..', 'secrets/REMOVED_AUTH_PROVIDER-admin.json');

        if (!fs.existsSync(credPath)) {
          throw new Error(`Firebase credentials not found at ${credPath}`);
        }

        const json = fs.readFileSync(credPath, 'utf8');
        serviceAccount = JSON.parse(json);
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  }

  async verifyIdToken(token: string) {
    return admin.auth().verifyIdToken(token);
  }

  // ✅ ADD THIS
  async setCustomUserClaims(uid: string, claims: Record<string, any>) {
    return admin.auth().setCustomUserClaims(uid, claims);
  }
}
