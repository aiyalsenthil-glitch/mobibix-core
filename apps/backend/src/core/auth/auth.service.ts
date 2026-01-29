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

    const tenantCode =
      dto.tenantCode && dto.tenantCode.trim() !== ''
        ? dto.tenantCode.trim()
        : undefined;

    return this.loginWithFirebase(dto.idToken, tenantCode);
  }

  /**
   * 🔒 CORE AUTH LOGIC
   */
  async loginWithFirebase(REMOVED_AUTH_PROVIDERToken: string, tenantCode?: string) {
    try {
      // ─────────────────────────────
      // 1️⃣ Verify Firebase token
      // ─────────────────────────────
      const decoded = await this.REMOVED_AUTH_PROVIDERAdmin.verifyIdToken(REMOVED_AUTH_PROVIDERToken);

      if (!decoded?.uid) {
        throw new UnauthorizedException('Invalid Firebase payload');
      }

      // ─────────────────────────────
      // 2️⃣ Find or create user (atomic upsert prevents race condition)
      // ─────────────────────────────
      const user = await this.prisma.user.upsert({
        where: { REMOVED_AUTH_PROVIDERUid: decoded.uid },
        update: {
          email: decoded.email ?? null,
          fullName: decoded.name ?? null,
        },
        create: {
          REMOVED_AUTH_PROVIDERUid: decoded.uid,
          email: decoded.email ?? null,
          fullName: decoded.name ?? null,
          role: UserRole.USER, // First login defaults to USER, can be upgraded to ADMIN/OWNER by admins
          tenantId: null,
        },
      });

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
          await this.prisma.userTenant.upsert({
            where: {
              userId_tenantId: {
                userId: user.id,
                tenantId: invite.tenantId,
              },
            },
            update: {
              role: UserRole.STAFF,
            },
            create: {
              userId: user.id,
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
      // 4️⃣ Resolve active tenant context
      // ─────────────────────────────

      let activeUserTenant: {
        tenantId: string;
        role: UserRole;
        tenant: {
          id: string;
          name: string;
        };
      } | null = null;

      if (tenantCode) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { code: tenantCode },
        });

        if (!tenant) {
          throw new UnauthorizedException('Tenant code is invalid');
        }

        activeUserTenant = await this.prisma.userTenant.findFirst({
          where: {
            userId: user.id,
            tenantId: tenant.id,
          },
          include: { tenant: true },
        });
      } else {
        const userTenants = await this.prisma.userTenant.findMany({
          where: { userId: user.id },
          include: { tenant: true },
        });

        activeUserTenant = userTenants[0] ?? null;
      }

      // 🚫 Tenant requested but user not linked → BLOCK
      if (tenantCode && !activeUserTenant) {
        throw new UnauthorizedException('User is not linked to this tenant');
      }

      // 🟢 First login without tenant context (allowed)
      if (!tenantCode && !activeUserTenant) {
        const token = this.jwtService.sign({
          sub: user.id,
          tenantId: null,
          role: user.role.toLowerCase(), // Convert to lowercase for frontend
        });

        return {
          accessToken: token,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role.toLowerCase() as any, // Convert to lowercase for frontend
            tenantId: null,
          },
          tenant: null,
        };
      }
      const resolvedUserTenant = activeUserTenant!;
      // ─────────────────────────────
      // 4.5️⃣ Set Firebase custom claims (SAFE)
      // ─────────────────────────────

      if (activeUserTenant && decoded.tenantId !== activeUserTenant.tenantId) {
        await this.REMOVED_AUTH_PROVIDERAdmin.setCustomUserClaims(user.REMOVED_AUTH_PROVIDERUid, {
          tenantId: activeUserTenant.tenantId,
          role: activeUserTenant.role,
        });
      }

      // ─────────────────────────────
      // 5️⃣ Issue JWT
      // ─────────────────────────────
      const token = this.jwtService.sign({
        sub: user.id,
        tenantId: resolvedUserTenant.tenantId,
        role: resolvedUserTenant.role.toLowerCase(), // Convert to lowercase for frontend
      });

      return {
        accessToken: token,
        user: {
          id: user.id,
          tenantId: activeUserTenant?.tenantId ?? null,
          role: (activeUserTenant?.role ?? UserRole.USER).toLowerCase() as any,
          name: user.fullName,
          email: user.email,
        },
        tenant: {
          id: resolvedUserTenant.tenant.id,
          name: resolvedUserTenant.tenant.name,
        },
      };
    } catch (err) {
      // Log the actual error for debugging
      console.error('❌ Auth Service Error:', {
        message: err?.message,
        code: err?.code,
        name: err?.name,
        stack: err?.stack,
        fullError: err,
      });

      // Firebase / auth errors → 401
      if (
        err instanceof UnauthorizedException ||
        err?.code?.includes?.('auth')
      ) {
        throw new UnauthorizedException('Firebase authentication failed');
      }

      // Prisma errors
      if (err?.code?.startsWith('P')) {
        console.error('Prisma Error Details:', {
          code: err.code,
          clientVersion: err.clientVersion,
          meta: err.meta,
        });
        throw new InternalServerErrorException(
          `Database error: ${err.code} - ${err.message}`,
        );
      }

      // Everything else → controlled 500
      throw new InternalServerErrorException(
        `Authentication service failed: ${err?.message || 'Unknown error'}`,
      );
    }
  }
}
