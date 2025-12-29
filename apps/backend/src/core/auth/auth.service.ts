import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { FirebaseAdminService } from '../REMOVED_AUTH_PROVIDER/REMOVED_AUTH_PROVIDERAdmin';
import { GoogleExchangeDto } from './dto/google-exchange.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly REMOVED_AUTH_PROVIDERAdmin: FirebaseAdminService,
  ) {}

  /**
   * 🌐 PUBLIC ENTRY
   * Google / Firebase token → App JWT
   * Controller calls THIS method
   */
  async exchangeGoogleToken(dto: GoogleExchangeDto) {
    if (!dto?.idToken) {
      throw new UnauthorizedException('Missing Google/Firebase token');
    }

    // Delegate to single trusted login flow
    return this.loginWithFirebase(dto.idToken);
  }

  /**
   * 🔒 CORE AUTH LOGIC
   * This is the ONLY place where:
   * - user is created
   * - role is assigned
   * - tenant is attached
   * - JWT is issued
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

    // 🔍 Find or create user
    let user = await this.prisma.user.findUnique({
      where: { REMOVED_AUTH_PROVIDERUid: decoded.uid },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          REMOVED_AUTH_PROVIDERUid: decoded.uid,
          email: decoded.email ?? null,
          fullName: decoded.name ?? null,
          role: UserRole.OWNER, // default role
          tenantId: null,
        },
      });
    }

    // ✅ STAFF INVITE AUTO-ACCEPT
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

    // 🏢 Fetch tenant details (if assigned)
    const tenant = user.tenantId
      ? await this.prisma.tenant.findUnique({
          where: { id: user.tenantId },
        })
      : null;

    // 🔐 Issue JWT (FINAL authority)
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
