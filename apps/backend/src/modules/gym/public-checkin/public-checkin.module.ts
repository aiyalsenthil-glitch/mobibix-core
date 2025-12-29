import { Module } from '@nestjs/common';
import { PublicCheckinController } from './public-checkin.controller';
import { PublicCheckinService } from './public-checkin.service';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Module({
  controllers: [PublicCheckinController],
  providers: [PublicCheckinService, PrismaService],
})
export class PublicCheckinModule {}
