import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
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
   */
  async exchangeGoogleToken(dto: GoogleExchangeDto) {
    if (!dto?.idToken) {
      throw new UnauthorizedException('Missing Google/Firebase token');
    }

    return this.loginWithFirebase(dto.idToken);
  }

  /**
   * 🔒 CORE AUTH LOGIC
   */
  async loginWithFirebase(REMOVED_AUTH_PROVIDERToken: string) {
    try {
      // ─────────────────────────────
      // 1️⃣ Verify Firebase token
      // ─────────────────────────────
      const decoded = await this.REMOVED_AUTH_PROVIDERAdmin.verifyIdToken(REMOVED_AUTH_PROVIDERToken);

      if (!decoded?.uid) {
        throw new UnauthorizedException('Invalid Firebase payload');
      }

      // ─────────────────────────────
      // 2️⃣ Find or create user
      // ─────────────────────────────
      let user = await this.prisma.user.findUnique({
        where: { REMOVED_AUTH_PROVIDERUid: decoded.uid },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            REMOVED_AUTH_PROVIDERUid: decoded.uid,
            email: decoded.email ?? null,
            fullName: decoded.name ?? null,
            role: UserRole.OWNER,
            tenantId: null,
          },
        });
      }

      // ─────────────────────────────
      // 3️⃣ Staff invite auto-accept
      // ─────────────────────────────
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

      // ─────────────────────────────
      // 4️⃣ Fetch tenant (if exists)
      // ─────────────────────────────
      const tenant = user.tenantId
        ? await this.prisma.tenant.findUnique({
            where: { id: user.tenantId },
          })
        : null;
      // ─────────────────────────────
      // 4.5️⃣ Set Firebase custom claims (SAFE)
      // ─────────────────────────────

      if (user.tenantId && decoded.tenantId !== user.tenantId) {
        await this.REMOVED_AUTH_PROVIDERAdmin.setCustomUserClaims(user.REMOVED_AUTH_PROVIDERUid, {
          tenantId: user.tenantId,
          role: user.role,
        });
      }

      // ─────────────────────────────
      // 5️⃣ Issue JWT
      // ─────────────────────────────
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
    } catch (err) {
      // 🔥 CRITICAL: log exact reason
      console.error('❌ AUTH LOGIN FAILED:', err);

      // Firebase / auth errors → 401
      if (
        err instanceof UnauthorizedException ||
        err?.code?.includes?.('auth')
      ) {
        throw new UnauthorizedException('Firebase authentication failed');
      }

      // Everything else → controlled 500
      throw new InternalServerErrorException('Authentication service failed');
    }
  }
}
