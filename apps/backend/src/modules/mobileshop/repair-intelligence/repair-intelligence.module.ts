import { Module, forwardRef } from '@nestjs/common';
import { RepairIntelligenceService } from './repair-intelligence.service';
import { RepairPipelineMonitorService } from './repair-pipeline-monitor.service';
import { JobCardQCService } from './job-card-qc.service';
import { RepairPipelineController } from './repair-pipeline.controller';
import { PrismaModule } from '../../../core/prisma/prisma.module';
import { JobCardsModule } from '../jobcard/job-cards.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => JobCardsModule),
  ],
  controllers: [RepairPipelineController],
  providers: [
    RepairIntelligenceService,
    RepairPipelineMonitorService,
    JobCardQCService,
  ],
  exports: [
    RepairIntelligenceService,
    RepairPipelineMonitorService,
    JobCardQCService,
  ],
})
export class RepairIntelligenceModule {}
