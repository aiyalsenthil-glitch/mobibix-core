import { Module } from '@nestjs/common';
import { CustomerTimelineService } from './customer-timeline.service';
import { CustomerTimelineController } from './customer-timeline.controller';

@Module({
  controllers: [CustomerTimelineController],
  providers: [CustomerTimelineService],
  exports: [CustomerTimelineService], // Export if other modules need it
})
export class CustomerTimelineModule {}
