import { Module } from '@nestjs/common';
import { GymDashboardController } from './gym-dashboard.controller';
import { GymDashboardService } from './gym-dashboard.service';
import { CoreModule } from '../../../core/core.module';
import { GymAttendanceCron } from '../attendance/gym-attendance.cron';
import { GymAttendanceService } from '../attendance/gym-attendance.service';
import { GymMembershipService } from '../membership/gym-membership.service';
import { WhatsAppModule } from '../../whatsapp/whatsapp.module';

@Module({
  imports: [CoreModule, WhatsAppModule],
  controllers: [GymDashboardController],
  providers: [
    GymAttendanceService,
    GymMembershipService,
    GymDashboardService,
    GymAttendanceCron,
  ],
})
export class GymModule {}
