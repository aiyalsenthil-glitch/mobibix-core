import { Controller, Get, Patch, Req, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
export class UsersMeController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Req() req: any) {
    return this.usersService.getMeWithTenant(req.user.sub);
  }

  @Patch('me')
  updateMe(
    @Req() req: any,
    @Body() body: { fullName?: string; avatar?: string; phone?: string },
  ) {
    return this.usersService.updateProfile(req.user.sub, body);
  }
}
