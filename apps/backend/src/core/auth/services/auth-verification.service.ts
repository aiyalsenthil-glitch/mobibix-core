import { Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseAdminService } from '../../REMOVED_AUTH_PROVIDER/REMOVED_AUTH_PROVIDERAdmin';

@Injectable()
export class AuthVerificationService {
  constructor(private readonly REMOVED_AUTH_PROVIDERAdmin: FirebaseAdminService) {}

  async verifyFirebaseToken(token: string) {
    // 🧪 E2E Test Bypass
    if (
      process.env.NODE_ENV === 'test' ||
      token === 'mock_REMOVED_AUTH_PROVIDER_id_token'
    ) {
      if (token === 'invalid_token_xyz') {
        throw new UnauthorizedException('Mock: Invalid token');
      }

      return {
        uid: 'mock-user-uid',
        email: 'test@gmail.com',
        auth_time: Math.floor(Date.now() / 1000),
        iss: 'https://securetoken.google.com/mock-project',
        aud: 'mock-project',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        sub: 'mock-user-uid',
        REMOVED_AUTH_PROVIDER: {
          identities: { email: ['test@gmail.com'] },
          sign_in_provider: 'password',
        },
      } as any;
    }

    try {
      const decoded = await this.REMOVED_AUTH_PROVIDERAdmin.verifyIdToken(token);

      if (!decoded?.uid) {
        throw new UnauthorizedException('Invalid Firebase payload');
      }

      return decoded;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException(
        `Firebase authentication failed: ${err.message}`,
      );
    }
  }
}
