import { Controller, Get, Patch, Req, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import type { Request } from 'express';
import { User } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    tenantId: string | null;
    role: string;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersMeController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest): Promise<User> {
    return this.usersService.findById(req.user.userId);
  }

  @Patch('me')
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() body: { fullName?: string; phone?: string },
  ): Promise<User> {
    // 🔥 THIS IS THE FIX
    return this.usersService.updateProfile(req.user.userId, body);
  }
}
