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
      return await admin.auth().verifyIdToken(idToken);
    } catch (err: unknown) {
      this.logger.error('Firebase token verification failed', err as Error);
      throw new Error('Invalid Firebase ID token');
    }
  }

  /**
   * Find or create user from Firebase token.
   *
   * RULES (LOCK THESE):
   * - Role is set ONLY on first creation
   * - Role is NEVER modified on login
   * - StaffInvite is consumed only once
   */
  async findOrCreateUser(decodedToken: auth.DecodedIdToken) {
    const REMOVED_AUTH_PROVIDERUid = decodedToken.uid;
    const email: string | null = decodedToken.email ?? null;

    const fullName =
      typeof (decodedToken as Record<string, unknown>).name === 'string'
        ? (decodedToken as Record<string, string>).name
        : null;

    const avatar =
      typeof (decodedToken as Record<string, unknown>).picture === 'string'
        ? (decodedToken as Record<string, string>).picture
        : null;

    try {
      // 1️⃣ Check if user already exists (by Firebase UID)
      let user = await this.prisma.user.findUnique({
        where: { REMOVED_AUTH_PROVIDERUid },
      });

      // 2️⃣ Check staff invite ONLY if email exists
      let invite: { id: string; tenantId: string } | null = null;

      if (email) {
        invite = await this.prisma.staffInvite.findFirst({
          where: { email },
        });
      }

      // 3️⃣ Create user if first-time login
      if (!user) {
        let role: 'owner' | 'staff' = 'owner';
        let tenantId: string | null = null;

        if (invite) {
          role = 'staff';
          tenantId = invite.tenantId;
        }

        user = await this.prisma.user.create({
          data: {
            REMOVED_AUTH_PROVIDERUid,
            email,
            fullName,
            avatar,
            role,
            tenantId,
          },
        });

        // 4️⃣ Consume invite (one-time use)
        if (invite) {
          await this.prisma.staffInvite.delete({
            where: { id: invite.id },
          });
        }
      }

      // ❗ IMPORTANT: DO NOT UPDATE ROLE HERE
      // ❗ Login must never modify role or tenantId

      return user;
    } catch (err: unknown) {
      this.logger.error('Prisma user create error', err as Error);
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

    // normalize role (defensive)
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
