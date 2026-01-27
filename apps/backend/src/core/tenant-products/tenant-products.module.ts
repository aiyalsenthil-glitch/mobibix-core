import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantProductsService } from './tenant-products.service';
import { TenantProductsController } from './tenant-products.controller';

@Module({
  imports: [PrismaModule],
  providers: [TenantProductsService],
  controllers: [TenantProductsController],
  exports: [TenantProductsService],
})
export class TenantProductsModule {}
