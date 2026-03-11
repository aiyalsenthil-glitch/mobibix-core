import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { UsersMeController } from './users-me.controller';

import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [AuthModule, PermissionsModule], // 🔥 REQUIRED
  controllers: [UsersController, UsersMeController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
