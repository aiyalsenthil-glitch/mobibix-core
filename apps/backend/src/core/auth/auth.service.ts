import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { FirebaseAdminService } from '../REMOVED_AUTH_PROVIDER/REMOVED_AUTH_PROVIDERAdmin';
import { GoogleExchangeDto } from './dto/google-exchange.dto';

@Injectable()
export class AuthService {
  private readonly refreshTokenTtlMs = 30 * 24 * 60 * 60 * 1000;
  private readonly accessTokenTtlMs = 7 * 24 * 60 * 60 * 1000;

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
   * 🔁 Refresh access token using a stored refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    if (!refreshToken || refreshToken.trim() === '') {
      throw new UnauthorizedException('Missing refresh token');
    }

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.revokedAt) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    if (tokenRecord.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = tokenRecord.user;

    const userTenant = await this.prisma.userTenant.findFirst({
      where: { userId: user.id },
      select: {
        id: true,
        tenantId: true,
        role: true,
      },
    });

    const tenantId = userTenant?.tenantId ?? user.tenantId ?? null;
    const role = userTenant?.role ?? user.role;

    const accessToken = this.jwtService.sign({
      sub: user.id,
      tenantId,
      userTenantId: userTenant?.id ?? null,
      role,
    });

    return { accessToken, accessTokenExpiresIn: this.accessTokenTtlMs };
  }

  private async createRefreshToken(userId: string) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.refreshTokenTtlMs);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  async revokeRefreshToken(token: string) {
    if (!token || token.trim() === '') {
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * 🔒 CORE AUTH LOGIC (OPTIMIZED)
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

      // 🛑 Reject unverified email/password accounts
      // Google sign-in always has email_verified = true (or doesn't use 'password' provider)
      /* 
      if (
        decoded.REMOVED_AUTH_PROVIDER?.sign_in_provider === 'password' &&
        !decoded.email_verified
      ) {
        throw new UnauthorizedException('EMAIL_NOT_VERIFIED');
      } 
      */

      // 2️⃣ Find user, resolve tenant context, and check invites (PARALLEL)
      // Consolidate multiple queries into one parallel block to reduce round trips
      // 2️⃣ Find or Create User (Optimized)
      // We first try findUnique to avoid the overhead of a full upsert with includes
      let user = await this.prisma.user.findUnique({
        where: { REMOVED_AUTH_PROVIDERUid: decoded.uid },
        include: {
          userTenants: {
            include: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        // Create new user if they don't exist
        user = await this.prisma.user.create({
          data: {
            REMOVED_AUTH_PROVIDERUid: decoded.uid,
            email: decoded.email ?? null,
            fullName: decoded.name ?? null,
            role: UserRole.USER,
            tenantId: null,
          },
          include: {
            userTenants: {
              include: {
                tenant: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        });
      } else {
        // User exists, check if we need to update meta (async/fire-and-forget for speed)
        const needsUpdate =
          (decoded.email && user.email !== decoded.email) ||
          (decoded.name && user.fullName !== decoded.name);

        if (needsUpdate) {
          this.prisma.user
            .update({
              where: { id: user.id },
              data: {
                email: decoded.email ?? user.email,
                fullName: decoded.name ?? user.fullName,
              },
            })
            .catch((e) => console.warn('⚠️  Failed to update user meta:', e.message));
        }
      }

      const [globalTenant, staffInvite] = await Promise.all([
        tenantCode
          ? this.prisma.tenant.findUnique({
              where: { code: tenantCode },
              select: { id: true },
            })
          : Promise.resolve(null),
        decoded.email
          ? this.prisma.staffInvite.findFirst({
              where: {
                email: decoded.email,
                accepted: false,
              },
            })
          : Promise.resolve(null),
      ]);

      // ─────────────────────────────
      // 3️⃣ Resolve active tenant context (IN-MEMORY)
      // ─────────────────────────────
      const userTenants = user.userTenants;
      const userTenantCount = userTenants.length;
      let activeUserTenant: any = null;

      if (tenantCode) {
        if (!globalTenant) {
          throw new UnauthorizedException('Tenant code is invalid');
        }

        activeUserTenant = userTenants.find(
          (ut) => ut.tenant.code === tenantCode,
        );

        if (!activeUserTenant) {
          throw new UnauthorizedException('User is not linked to this tenant');
        }
      } else {
        // Fallback: Use the first linked tenant if it exists
        activeUserTenant = userTenants[0] || null;
      }

      // 🟢 First login without tenant context (allowed)
      if (!activeUserTenant) {
        const token = this.jwtService.sign({
          sub: user.id,
          tenantId: null,
          userTenantId: null,
          role: user.role,
        });

        const refreshToken = await this.createRefreshToken(user.id);

        return {
          accessToken: token,
          accessTokenExpiresIn: this.accessTokenTtlMs,
          refreshToken,
          refreshTokenExpiresIn: this.refreshTokenTtlMs,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role as any,
            tenantId: null,
            tenantCode: null,
          },
          tenant: null,
          tenantCount: userTenantCount,
        };
      }

      const resolvedUserTenant = activeUserTenant!;

      // ─────────────────────────────
      // 5️⃣ Accept staff invite (fire-and-forget but already resolved locally)
      // ─────────────────────────────
      const processStaffInvite = async () => {
        if (!staffInvite) return;

        try {
          await this.prisma.userTenant.upsert({
            where: {
              userId_tenantId: {
                userId: user.id,
                tenantId: staffInvite.tenantId,
              },
            },
            update: {
              role: UserRole.STAFF,
            },
            create: {
              userId: user.id,
              tenantId: staffInvite.tenantId,
              role: UserRole.STAFF,
            },
          });

          await this.prisma.staffInvite.update({
            where: { id: staffInvite.id },
            data: { accepted: true },
          });
        } catch (err) {
          console.warn('⚠️  Failed to accept staff invite:', err?.message);
        }
      };

      // ─────────────────────────────
      // 6️⃣ Issue JWT & Refresh Token
      // ─────────────────────────────
      const token = this.jwtService.sign({
        sub: user.id,
        tenantId: resolvedUserTenant.tenantId,
        userTenantId: resolvedUserTenant.id,
        role: resolvedUserTenant.role,
      });

      const [refreshToken] = await Promise.all([
        this.createRefreshToken(user.id),
        processStaffInvite(), // Run in parallel with token creation
      ]);

      // ─────────────────────────────
      // 7️⃣ Set Firebase custom claims (fire-and-forget for speed)
      // ─────────────────────────────
      this.REMOVED_AUTH_PROVIDERAdmin
        .setCustomUserClaims(user.REMOVED_AUTH_PROVIDERUid, {
          tenantId: resolvedUserTenant.tenantId,
          role: resolvedUserTenant.role,
        })
        .catch((err) => {
          console.warn(
            '⚠️  Failed to set Firebase custom claims:',
            err?.message,
          );
        });

      return {
        accessToken: token,
        accessTokenExpiresIn: this.accessTokenTtlMs,
        refreshToken,
        refreshTokenExpiresIn: this.refreshTokenTtlMs,
        user: {
          id: user.id,
          tenantId: activeUserTenant?.tenantId ?? null,
          tenantCode: resolvedUserTenant.tenant.code,
          role: activeUserTenant?.role ?? UserRole.USER,
          name: user.fullName,
          email: user.email,
        },
        tenant: {
          id: resolvedUserTenant.tenant.id,
          name: resolvedUserTenant.tenant.name,
          code: resolvedUserTenant.tenant.code,
        },
        tenantCount: userTenantCount,
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
        // If it's already our custom exception, rethrow it
        if (err.message === 'EMAIL_NOT_VERIFIED' || err.message === 'Invalid Firebase payload') {
            throw err;
        }
        throw new UnauthorizedException(`Firebase authentication failed: ${err.message}`);
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
