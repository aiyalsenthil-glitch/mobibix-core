import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // ✅ REQUIRED for JwtAuthGuard
  controllers: [StaffController],
})
export class StaffModule {}
