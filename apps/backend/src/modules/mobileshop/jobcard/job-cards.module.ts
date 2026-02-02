import { Module } from '@nestjs/common';
import { JobCardsController } from './job-cards.controller';
import { JobCardsService } from './job-cards.service';
import { JobStatusValidator } from './job-status-validator.service';
import { PrismaModule } from '../../../core/prisma/prisma.module';

import { CommonModule } from '../../../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [JobCardsController],
  providers: [JobCardsService, JobStatusValidator],
})
export class JobCardsModule {}
