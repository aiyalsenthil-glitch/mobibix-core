import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { FirebaseAdminService } from '../REMOVED_AUTH_PROVIDER/REMOVED_AUTH_PROVIDERAdmin';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly REMOVED_AUTH_PROVIDERAdmin: FirebaseAdminService,
  ) {}

  /**
   * Firebase token → App JWT
   * This is the ONLY place where user + role is decided.
   */

  async loginWithFirebase(REMOVED_AUTH_PROVIDERToken: string) {
    if (!REMOVED_AUTH_PROVIDERToken) {
      throw new UnauthorizedException('Missing Firebase token');
    }

    let decoded;
    try {
      decoded = await this.REMOVED_AUTH_PROVIDERAdmin.verifyIdToken(REMOVED_AUTH_PROVIDERToken);
    } catch (e) {
      console.error('❌ Firebase verify error:', e);
      throw new UnauthorizedException('Invalid Firebase token');
    }

    if (!decoded?.uid) {
      throw new UnauthorizedException('Invalid Firebase payload');
    }

    let user = await this.prisma.user.findUnique({
      where: { REMOVED_AUTH_PROVIDERUid: decoded.uid },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          REMOVED_AUTH_PROVIDERUid: decoded.uid,
          email: decoded.email ?? null,
          fullName: decoded.name ?? null,
          role: UserRole.OWNER, // default
          tenantId: null,
        },
      });
    }

    // ✅ STAFF INVITE AUTO-ACCEPT (CORRECT PLACE)
    if (decoded.email) {
      const invite = await this.prisma.staffInvite.findFirst({
        where: {
          email: decoded.email,
          accepted: false,
        },
      });

      if (invite) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            tenantId: invite.tenantId,
            role: UserRole.STAFF,
          },
        });

        await this.prisma.staffInvite.update({
          where: { id: invite.id },
          data: { accepted: true },
        });
      }
    }
    // ✅ FETCH TENANT DETAILS (ADD THIS)
    const tenant = user.tenantId
      ? await this.prisma.tenant.findUnique({
          where: { id: user.tenantId },
        })
      : null;

    // ✅ ISSUE JWT AFTER FINAL ROLE / TENANT IS SET
    const token = this.jwtService.sign({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.fullName,
        email: user.email,
        tenantId: user.tenantId,
      },
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
          }
        : null,
    };
  }
}
