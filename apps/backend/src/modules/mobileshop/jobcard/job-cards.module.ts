import { Module } from '@nestjs/common';
import { JobCardsController } from './job-cards.controller';
import { PublicJobController } from './public-job.controller';
import { JobCardsService } from './job-cards.service';

@Module({
  controllers: [JobCardsController, PublicJobController],
  providers: [JobCardsService],
})
export class JobCardsModule {}
