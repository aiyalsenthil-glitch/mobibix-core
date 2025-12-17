import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import admin from '../REMOVED_AUTH_PROVIDER/REMOVED_AUTH_PROVIDERAdmin';
import { PrismaService } from '../prisma/prisma.service';
import type { auth } from 'REMOVED_AUTH_PROVIDER-admin';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async verifyFirebaseIdToken(idToken: string) {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      return decoded;
    } catch (err: unknown) {
      this.logger.error('Firebase token verification failed', err as Error);
      throw new Error('Invalid Firebase ID token');
    }
  }

  /**
   * Find or create user from Firebase token.
   * IMPORTANT:
   * - Role is set ONLY on first creation
   * - Role is NEVER modified on login
   */
  async findOrCreateUser(decodedToken: auth.DecodedIdToken, tenantId?: string) {
    const REMOVED_AUTH_PROVIDERUid = decodedToken.uid;
    const email = decodedToken.email ?? null;

    const fullName =
      typeof (decodedToken as Record<string, unknown>).name === 'string'
        ? (decodedToken as Record<string, string>).name
        : null;

    const avatar =
      typeof (decodedToken as Record<string, unknown>).picture === 'string'
        ? (decodedToken as Record<string, string>).picture
        : null;

    try {
      // 1️⃣ Check if user already exists
      let user = await this.prisma.user.findUnique({
        where: { REMOVED_AUTH_PROVIDERUid },
      });

      if (!user) {
        // 2️⃣ First-time user → assign default role
        const initialRole = tenantId ? 'staff' : 'owner';

        user = await this.prisma.user.create({
          data: {
            REMOVED_AUTH_PROVIDERUid,
            email,
            fullName,
            avatar,
            tenantId: tenantId ?? null,
            role: initialRole,
          },
        });
      } else {
        // 3️⃣ Existing user → update ONLY profile fields (NOT role)
        user = await this.prisma.user.update({
          where: { REMOVED_AUTH_PROVIDERUid },
          data: {
            email: email ?? undefined,
            fullName: fullName ?? undefined,
            avatar: avatar ?? undefined,
            // ❌ role intentionally NOT updated
          },
        });
      }

      return user;
    } catch (err: unknown) {
      this.logger.error('Prisma user create/update error', err as Error);
      throw new Error('Database error while handling user');
    }
  }

  async validateJwtPayload(payload: {
    sub: string;
    tenantId?: string;
    role?: string;
  }) {
    if (!payload?.sub) return null;

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) return null;

    // normalize role
    if (typeof user.role === 'string' && user.role.length > 0) {
      user.role = user.role.toLowerCase();
    } else {
      user.role = 'member';
    }

    return user;
  }

  createBackendToken(user: {
    id: string;
    tenantId?: string | null;
    role?: string | null;
  }) {
    const payload = {
      sub: user.id,
      tenantId: user.tenantId ?? null,
      role: (user.role ?? 'member').toLowerCase(),
    };

    return this.jwtService.sign(payload);
  }
}
