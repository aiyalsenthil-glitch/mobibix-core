import {
  Controller,
  Get,
  Head,
  HttpCode,
  Req,
  UseGuards,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './core/auth/guards/jwt-auth.guard';
import { Roles } from './core/auth/decorators/roles.decorator';
import { Public } from './core/auth/decorators/public.decorator';
import { Request } from 'express';
import type { UserContext } from './app.service';
import { RequirePermission } from './core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from './security/permission-registry';
import { SkipTenant } from './core/auth/decorators/skip-tenant.decorator';

type AppRequest = Request & {
  user: UserContext;
  params: {
    tenantType: string;
  };
};

@Controller({ version: VERSION_NEUTRAL }) // <-- IMPORTANT: empty, no 'auth'
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @Head()
  root() {
    return { status: 'Backend is running' };
  }

  /** Silences browser/crawler favicon requests — returns 204 No Content to avoid 404 log spam */
  @Public()
  @Get('favicon.ico')
  @HttpCode(204)
  favicon() {
    // Intentionally empty — 204 No Content suppresses browser favicon 404 log spam
  }

  @Public()
  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'OWNER', 'STAFF', 'USER')
  @SkipTenant()
  @RequirePermission(PERMISSIONS.CORE.PROFILE.VIEW)
  @Get('me')
  getMe(@Req() req: AppRequest) {
    return {
      message: 'Protected route works',
      user: req.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'OWNER', 'STAFF', 'USER')
  @SkipTenant()
  @RequirePermission(PERMISSIONS.CORE.TENANT.VIEW)
  @Get('tenants')
  getTenants(@Req() req: AppRequest): ReturnType<AppService['getTenants']> {
    return this.appService.getTenants(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'OWNER', 'STAFF', 'USER')
  @SkipTenant()
  @RequirePermission(PERMISSIONS.CORE.TENANT.VIEW)
  @Get('tenants/:tenantType')
  getTenantsByType(
    @Req() req: AppRequest,
  ): ReturnType<AppService['getTenantsByType']> {
    return this.appService.getTenantsByType(req.user, req.params.tenantType);
  }
}
