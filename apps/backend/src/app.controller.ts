import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './core/auth/guards/jwt-auth.guard';
import { Roles } from './core/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller() // <-- IMPORTANT: empty, no 'auth'
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  root() {
    return { status: 'Backend is running' };
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @Get('me')
  getMe(@Req() req: any) {
    return {
      message: 'Protected route works',
      user: req.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @Get('tenants')
  async getTenants(@Req() req: any) {
    return this.appService.getTenants(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  @Get('tenants/:tenantType')
  async getTenantsByType(@Req() req: any) {
    return this.appService.getTenantsByType(req.user, req.params.tenantType);
  }
}
