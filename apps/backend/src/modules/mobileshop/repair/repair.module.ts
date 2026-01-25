import { Module } from '@nestjs/common';
import { RepairController } from './repair.controller';
import { RepairService } from './repair.service';
import { PrismaService } from 'src/core/prisma/prisma.service';

@Module({
  controllers: [RepairController],
  providers: [RepairService, PrismaService],
  exports: [RepairService],
})
export class RepairModule {}
