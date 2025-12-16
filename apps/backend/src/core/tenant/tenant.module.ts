import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // 👈 THIS FIXES THE ERROR
  controllers: [TenantController],
  providers: [TenantService],
})
export class TenantModule {}
