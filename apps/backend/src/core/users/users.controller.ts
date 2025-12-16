// src/core/users/users.controller.ts
import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { Request } from 'express';
import { User } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    tenantId: string;
    role: string;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
@Roles(Role.OWNER)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateUserDto,
  ): Promise<User> {
    return this.usersService.createUser(req.user.tenantId, dto);
  }

  @Get()
  async list(@Req() req: AuthenticatedRequest): Promise<User[]> {
    return this.usersService.listUsers(req.user.tenantId);
  }
}
