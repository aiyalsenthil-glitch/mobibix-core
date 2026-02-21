import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { GoogleExchangeDto } from './dto/google-exchange.dto';
import { AuthVerificationService } from './services/auth-verification.service';
import { UserResolutionService } from './services/user-resolution.service';
import { TokenFactoryService } from './services/token-factory.service';
import { FirebaseAdminService } from '../REMOVED_AUTH_PROVIDER/REMOVED_AUTH_PROVIDERAdmin';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authVerification: AuthVerificationService,
    private readonly userResolution: UserResolutionService,
    private readonly tokenFactory: TokenFactoryService,
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

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid, revoked, or expired refresh token');
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

    const accessToken = this.tokenFactory.generateAccessToken({
      sub: user.id,
      tenantId,
      userTenantId: userTenant?.id ?? null,
      role,
    });

    return { 
      accessToken, 
      accessTokenExpiresIn: this.tokenFactory.accessTokenTtlMs 
    };
  }

  async revokeRefreshToken(token: string) {
    await this.tokenFactory.revokeRefreshToken(token);
  }

  /**
   * 🔒 CORE AUTH LOGIC (MODULARIZED)
   */
  async loginWithFirebase(REMOVED_AUTH_PROVIDERToken: string, tenantCode?: string) {
    try {
      // 1️⃣ Verify Firebase token
      const decoded = await this.authVerification.verifyFirebaseToken(REMOVED_AUTH_PROVIDERToken);

      // 2️⃣ Resolve user and check for invites
      let [user, staffInvite] = await Promise.all([
        this.userResolution.resolveUser(decoded),
        this.userResolution.checkInvites(decoded.email),
      ]);

      // 3️⃣ Process Invite IF it exists (CRITICAL for correct initial redirect)
      if (staffInvite) {
        await this.userResolution.processStaffInvite(user.id, staffInvite);
        // Re-fetch user to include newly linked tenants
        user = await this.userResolution.resolveUser(decoded);
      }

      // 4️⃣ Resolve active tenant context
      const activeUserTenant = await this.userResolution.resolveActiveTenant(
        user,
        tenantCode,
      );
      const userTenantCount = user.userTenants.length;

      // 5️⃣ Resolve IDs for JWT
      const tenantId = activeUserTenant?.tenantId ?? null;
      const userTenantId = activeUserTenant?.id ?? null;
      const role = activeUserTenant?.role ?? user.role;
      const isSystemOwner = (activeUserTenant as any)?.isSystemOwner ?? false;

      // 6️⃣ Issue JWT & Refresh Token
      const token = this.tokenFactory.generateAccessToken({
        sub: user.id,
        tenantId,
        userTenantId,
        role,
        isSystemOwner,
      });

      const refreshToken = await this.tokenFactory.createRefreshToken(user.id);

      // 7️⃣ Set Firebase custom claims (fire-and-forget)
      if (tenantId) {
        this.REMOVED_AUTH_PROVIDERAdmin.setCustomUserClaims(user.REMOVED_AUTH_PROVIDERUid, {
          tenantId,
          role,
        }).catch(err => console.warn('⚠️  Firebase Claims Sync Failed:', err.message));
      }

      return {
        accessToken: token,
        accessTokenExpiresIn: this.tokenFactory.accessTokenTtlMs,
        refreshToken,
        refreshTokenExpiresIn: this.tokenFactory.refreshTokenTtlMs,
        user: {
          id: user.id,
          tenantId,
          tenantCode: activeUserTenant?.tenant.code ?? null,
          role: role as UserRole,
          isSystemOwner,
          name: user.fullName,
          email: user.email,
        },
        tenant: activeUserTenant ? {
          id: activeUserTenant.tenant.id,
          name: activeUserTenant.tenant.name,
          code: activeUserTenant.tenant.code,
        } : null,
        tenantCount: userTenantCount,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException || err instanceof InternalServerErrorException) {
        throw err;
      }
      
      console.error('❌ AuthService Error:', err);
      throw new InternalServerErrorException(
        `Authentication failed: ${err.message || 'Unknown error'}`
      );
    }
  }
}
