import { Module } from '@nestjs/common';
import { B2BService } from './b2b.service';
import { B2BController } from './b2b.controller';
import { PrismaModule } from '../../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [B2BController],
  providers: [B2BService],
  exports: [B2BService],
})
export class B2BModule {}
