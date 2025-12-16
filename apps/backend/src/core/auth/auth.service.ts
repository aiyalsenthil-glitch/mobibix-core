// apps/backend/src/auth/auth.service.ts
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

  async findOrCreateUser(decodedToken: auth.DecodedIdToken, tenantId?: string) {
    const REMOVED_AUTH_PROVIDERUid = decodedToken.uid;
    const email = decodedToken.email ?? null;

    // safely extract optional fields
    const fullName =
      typeof (decodedToken as unknown as Record<string, unknown>).name ===
      'string'
        ? (decodedToken as unknown as Record<string, string>).name
        : null;

    const avatar =
      typeof (decodedToken as unknown as Record<string, unknown>).picture ===
      'string'
        ? (decodedToken as unknown as Record<string, string>).picture
        : null;

    const role = (tenantId ? 'staff' : 'owner').toLowerCase();

    try {
      const user = await this.prisma.user.upsert({
        where: { REMOVED_AUTH_PROVIDERUid },
        update: {
          email: email ?? undefined,
          fullName: fullName ?? undefined,
          avatar: avatar ?? undefined,
          role,
        },
        create: {
          REMOVED_AUTH_PROVIDERUid,
          email,
          fullName,
          avatar,
          tenantId: tenantId ?? null,
          role,
        },
      });

      return user;
    } catch (err: unknown) {
      this.logger.error('Prisma upsert user error', err as Error);
      throw new Error('Database error while creating user');
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
