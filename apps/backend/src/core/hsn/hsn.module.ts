import { Module } from '@nestjs/common';
import { HsnController } from './hsn.controller';
import { HsnService } from './hsn.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HsnController],
  providers: [HsnService],
  exports: [HsnService],
})
export class HsnModule {}
