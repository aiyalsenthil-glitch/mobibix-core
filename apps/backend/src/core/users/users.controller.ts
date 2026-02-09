import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(@Req() req: any) {
    return this.usersService.findByTenant(req.user.tenantId);
  }
}
