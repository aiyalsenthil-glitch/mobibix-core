import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './core/auth/guards/jwt-auth.guard';

@Controller() // <-- IMPORTANT: empty, no 'auth'
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  root() {
    return { status: 'Backend is running' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: any) {
    return {
      message: 'Protected route works',
      user: req.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('tenants')
  async getTenants(@Req() req: any) {
    return this.appService.getTenants(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tenants/:tenantType')
  async getTenantsByType(@Req() req: any) {
    return this.appService.getTenantsByType(req.user, req.params.tenantType);
  }
}
