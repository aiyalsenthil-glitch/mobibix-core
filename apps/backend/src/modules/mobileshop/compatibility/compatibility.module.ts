import { Module } from '@nestjs/common';
import { CompatibilityController } from './compatibility.controller';
import { CompatibilityAdminController } from './compatibility-admin.controller';
import { CompatibilityService } from './compatibility.service';

@Module({
  controllers: [CompatibilityController, CompatibilityAdminController],
  providers: [CompatibilityService],
  exports: [CompatibilityService],
})
export class CompatibilityModule {}
