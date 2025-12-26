import { Controller, Get, Req, UseGuards, Body, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(@Req() req: any) {
    return this.usersService.findByTenant(req.user.tenantId);
  }
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMyProfile(
    @Req() req: any,
    @Body() body: { fullName?: string; phone?: string },
  ) {
    return this.usersService.updateProfile(
      req.user.sub, // ✅ THIS IS IMPORTANT
      body,
    );
  }
}
