import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  Get,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { SkipSubscriptionCheck } from './decorators/skip-subscription-check.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { GoogleExchangeDto } from './dto/google-exchange.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { FirebaseAdminService } from '../REMOVED_AUTH_PROVIDER/REMOVED_AUTH_PROVIDERAdmin';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import type { Response, Request } from 'express';
import { randomBytes } from 'crypto';

@Controller('auth')
@SkipSubscriptionCheck() // Auth endpoints should not check subscription
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly REMOVED_AUTH_PROVIDERAdmin: FirebaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

  private buildCookieOptions(maxAge: number) {
    const isProd = process.env.NODE_ENV === 'production';

    return {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      maxAge,
      path: '/',
    } as const;
  }

  private buildCsrfCookieOptions(maxAge: number) {
    const baseOptions = this.buildCookieOptions(maxAge);
    return {
      ...baseOptions,
      httpOnly: false,
      path: '/',
    } as const;
  }

  private generateCsrfToken() {
    return randomBytes(32).toString('hex');
  }

  private clearAuthCookies(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const baseOptions = {
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      path: '/',
    } as const;

    res.clearCookie('accessToken', baseOptions);
    res.clearCookie('refreshToken', baseOptions);
    res.clearCookie('csrfToken', baseOptions);
    res.clearCookie('gp_session_hint', baseOptions);
    res.clearCookie('mobi_session_hint', baseOptions);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute - prevent brute force
  @Post('REMOVED_AUTH_PROVIDER')
  async loginWithFirebase(
    @Body() body: { idToken?: string; tenantCode?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body?.idToken) {
      throw new UnauthorizedException('Missing idToken');
    }

    // Pass tenantCode to AuthService to ensure correct tenant context
    const result = await this.authService.loginWithFirebase(
      body.idToken,
      body.tenantCode,
    );

    if (result?.accessToken) {
      res.cookie(
        'accessToken',
        result.accessToken,
        this.buildCookieOptions(result.accessTokenExpiresIn),
      );
    }

    if (result?.refreshToken) {
      res.cookie(
        'refreshToken',
        result.refreshToken,
        this.buildCookieOptions(result.refreshTokenExpiresIn),
      );
    }

    const csrfToken = this.generateCsrfToken();
    const csrfOptions = this.buildCsrfCookieOptions(result.accessTokenExpiresIn);

    res.cookie('csrfToken', csrfToken, csrfOptions);

    // 🍪 Set Client-Readable Session Hints (Non-HttpOnly)
    // Helps SPAs know if a session exists without reading HttpOnly cookies
    res.cookie('gp_session_hint', '1', csrfOptions);
    res.cookie('mobi_session_hint', '1', csrfOptions);

    return { ...result, csrfToken };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute - prevent brute force
  @Post('google/exchange')
  async exchangeToken(
    @Body() dto: GoogleExchangeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.exchangeGoogleToken(dto);

    if (result?.accessToken) {
      res.cookie(
        'accessToken',
        result.accessToken,
        this.buildCookieOptions(result.accessTokenExpiresIn),
      );
    }

    if (result?.refreshToken) {
      res.cookie(
        'refreshToken',
        result.refreshToken,
        this.buildCookieOptions(result.refreshTokenExpiresIn),
      );
    }

    const csrfToken = this.generateCsrfToken();
    const csrfOptions = this.buildCsrfCookieOptions(result.accessTokenExpiresIn);

    res.cookie('csrfToken', csrfToken, csrfOptions);

    // 🍪 Set Client-Readable Session Hints (Non-HttpOnly)
    res.cookie('gp_session_hint', '1', csrfOptions);
    res.cookie('mobi_session_hint', '1', csrfOptions);

    return { ...result, csrfToken };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute - allow more for token refresh
  @Post('refresh')
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieToken = req.cookies?.refreshToken as string | undefined;
    const refreshToken = dto.refreshToken || cookieToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const result = await this.authService.refreshAccessToken(refreshToken);

    if (result?.accessToken) {
      res.cookie(
        'accessToken',
        result.accessToken,
        this.buildCookieOptions(result.accessTokenExpiresIn),
      );
    }

    const csrfToken = this.generateCsrfToken();
    const csrfOptions = this.buildCsrfCookieOptions(result.accessTokenExpiresIn);

    res.cookie('csrfToken', csrfToken, csrfOptions);

    // 🍪 Set Client-Readable Session Hints (Non-HttpOnly)
    res.cookie('gp_session_hint', '1', csrfOptions);
    res.cookie('mobi_session_hint', '1', csrfOptions);

    return { ...result, csrfToken };
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    if (refreshToken) {
      await this.authService.revokeRefreshToken(refreshToken);
    }

    this.clearAuthCookies(res);

    return { success: true };
  }

  @Public()
  @Get('debug/REMOVED_AUTH_PROVIDER-claims')
  async debugFirebaseClaims(@Req() req: any) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'Missing Authorization Bearer token' };
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await this.REMOVED_AUTH_PROVIDERAdmin.verifyIdToken(token);

    return decoded;
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-verification-email')
  async sendVerificationEmail(@Req() req: any) {
    const userId = req.user.userId;
    // Call the Auth Service to handle the generation and dispatch
    await this.authService.sendVerificationEmail(userId);
    return { success: true, message: 'Verification email sent' };
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @Get('my-tenants')
  async getMyTenants(@Req() req: any) {
    const userId = req.user.userId;

    // Get primary tenant (from User.tenantId)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          select: {
            id: true,
            code: true,
            name: true,
            tenantType: true,
          },
        },
      },
    });

    // Get additional tenants from UserTenant junction table
    const userTenants = await this.prisma.userTenant.findMany({
      where: { userId },
      include: {
        tenant: {
          select: {
            id: true,
            code: true,
            name: true,
            tenantType: true,
          },
        },
      },
    });

    // Combine and deduplicate
    const tenants: Array<{
      id: string;
      code: string;
      name: string;
      type: string;
      isPrimary: boolean;
      role: UserRole;
    }> = [];
    const seenIds = new Set<string>();

    // Add primary tenant if exists
    if (user?.tenant) {
      tenants.push({
        id: user.tenant.id,
        code: user.tenant.code,
        name: user.tenant.name,
        type: user.tenant.tenantType,
        isPrimary: true,
        role: user.role,
      });
      seenIds.add(user.tenant.id);
    }

    // Add other tenants
    for (const ut of userTenants) {
      if (!seenIds.has(ut.tenant.id)) {
        tenants.push({
          id: ut.tenant.id,
          code: ut.tenant.code,
          name: ut.tenant.name,
          type: ut.tenant.tenantType,
          isPrimary: false,
          role: ut.role,
        });
        seenIds.add(ut.tenant.id);
      }
    }

    return tenants;
  }
}
