import { Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseAdminService } from '../../REMOVED_AUTH_PROVIDER/REMOVED_AUTH_PROVIDERAdmin';

@Injectable()
export class AuthVerificationService {
  constructor(private readonly REMOVED_AUTH_PROVIDERAdmin: FirebaseAdminService) {}

  async verifyFirebaseToken(token: string) {
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
