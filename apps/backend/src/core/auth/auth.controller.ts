import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { GoogleExchangeDto } from './dto/google-exchange.dto';
import { FirebaseAdminService } from '../REMOVED_AUTH_PROVIDER/REMOVED_AUTH_PROVIDERAdmin';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly REMOVED_AUTH_PROVIDERAdmin: FirebaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('REMOVED_AUTH_PROVIDER')
  async loginWithFirebase(
    @Body() body: { idToken?: string; tenantCode?: string },
  ) {
    if (!body?.idToken) {
      throw new UnauthorizedException('Missing idToken');
    }

    // Pass tenantCode to AuthService to ensure correct tenant context
    return this.authService.loginWithFirebase(body.idToken, body.tenantCode);
  }
  @Public()
  @Post('google/exchange')
  exchangeToken(@Body() dto: GoogleExchangeDto) {
    return this.authService.exchangeGoogleToken(dto);
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
