import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GlobalSuppliersController } from './global-suppliers.controller';
import { GlobalSuppliersService } from './global-suppliers.service';

@Module({
  imports: [PrismaModule],
  controllers: [GlobalSuppliersController],
  providers: [GlobalSuppliersService],
  exports: [GlobalSuppliersService],
})
export class GlobalSuppliersModule {}
