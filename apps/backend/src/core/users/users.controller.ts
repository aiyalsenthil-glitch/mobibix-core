import { Controller, Get, Req, UseGuards } from '@nestjs/common';
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
    @Body() body: { name?: string; phone?: string },
  ) {
    return this.usersService.updateProfile(req.user.id, body);
  }
}
