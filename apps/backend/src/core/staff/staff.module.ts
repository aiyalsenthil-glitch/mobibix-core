import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { AuthModule } from '../auth/auth.module';
import { StaffService } from './staff.service';
import { UsersModule } from '../users/users.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [AuthModule, UsersModule], // ✅ REQUIRED for JwtAuthGuard
  controllers: [StaffController],
  providers: [StaffService, PrismaService],
})
export class StaffModule {}
