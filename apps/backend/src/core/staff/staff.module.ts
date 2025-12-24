import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, UsersModule], // ✅ REQUIRED for JwtAuthGuard
  controllers: [StaffController],
})
export class StaffModule {}
