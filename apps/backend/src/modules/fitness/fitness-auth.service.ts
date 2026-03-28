import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { FirebaseAdminService } from '../../core/REMOVED_AUTH_PROVIDER/REMOVED_AUTH_PROVIDERAdmin';

@Injectable()
export class FitnessAuthService {
  private readonly logger = new Logger(FitnessAuthService.name);
  readonly accessTokenTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly REMOVED_AUTH_PROVIDERAdmin: FirebaseAdminService,
  ) {}

  async loginWithFirebase(idToken: string) {
    const decoded = await this.REMOVED_AUTH_PROVIDERAdmin.verifyIdToken(idToken);

    if (!decoded?.uid) {
      throw new UnauthorizedException('Invalid Firebase token');
    }

    if (!decoded.email_verified) {
      throw new UnauthorizedException('Email not verified. Please verify your email before logging in.');
    }

    const profile = await this.prisma.fitnessProfile.upsert({
      where: { REMOVED_AUTH_PROVIDERUid: decoded.uid },
      create: {
        id: `fp_${decoded.uid.slice(0, 16)}${Date.now().toString(36)}`,
        REMOVED_AUTH_PROVIDERUid: decoded.uid,
        email: decoded.email ?? null,
        fullName: decoded.name ?? null,
      },
      update: {
        email: decoded.email ?? undefined,
        fullName: decoded.name ? decoded.name : undefined,
      },
      select: { id: true, email: true, fullName: true, phone: true, goalType: true },
    });

    const accessToken = this.jwtService.sign(
      { sub: profile.id, role: 'FITNESS_USER' },
      { expiresIn: '7d' },
    );

    return { accessToken, profile };
  }
}
