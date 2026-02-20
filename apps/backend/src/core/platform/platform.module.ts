import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { BusinessCategoryController } from './business-category.controller';
import { BusinessCategoryService } from './business-category.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, AuthModule, BillingModule],
  controllers: [PlatformController, BusinessCategoryController],
  providers: [PlatformService, BusinessCategoryService],
  exports: [PlatformService, BusinessCategoryService],
})
export class PlatformModule {}
