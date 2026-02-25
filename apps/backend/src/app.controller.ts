import { Controller, Get, Head, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './core/auth/guards/jwt-auth.guard';
import { Roles } from './core/auth/decorators/roles.decorator';
import type { Request } from 'express';
import type { UserContext } from './app.service';

type AppRequest = Request & {
  user: UserContext;
  params: {
    tenantType: string;
  };
};

@Controller() // <-- IMPORTANT: empty, no 'auth'
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Head()
  root() {
    return { status: 'Backend is running' };
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'OWNER', 'STAFF')
  @Get('me')
  getMe(@Req() req: AppRequest) {
    return {
      message: 'Protected route works',
      user: req.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'OWNER', 'STAFF')
  @Get('tenants')
  getTenants(@Req() req: AppRequest): ReturnType<AppService['getTenants']> {
    return this.appService.getTenants(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN', 'OWNER', 'STAFF')
  @Get('tenants/:tenantType')
  getTenantsByType(
    @Req() req: AppRequest,
  ): ReturnType<AppService['getTenantsByType']> {
    return this.appService.getTenantsByType(req.user, req.params.tenantType);
  }
}
