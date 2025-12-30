import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { GymModule as GymDashboardModule } from './dashboard/gym.module';

import { GymAttendanceController } from './attendance/gym-attendance.controller';
import { GymAttendanceService } from './attendance/gym-attendance.service';

import { GymMembershipController } from './membership/gym-membership.controller';
import { GymMembershipService } from './membership/gym-membership.service';
import { SubscriptionCron } from '../../core/billing/subscriptions/subscription.cron';
import { GymDashboardController } from './dashboard/gym-dashboard.controller';
import { GymDashboardService } from './dashboard/gym-dashboard.service';
import { GymMembersController } from './gym-members.controller';
import { PublicCheckinModule } from './public-checkin/public-checkin.module';
import { PaymentsModule } from '../../core/billing/payments/payments.module';

@Module({
  imports: [
    CoreModule,
    GymDashboardModule,
    PublicCheckinModule,
    PaymentsModule,
  ],
  controllers: [
    GymAttendanceController,
    GymMembershipController,
    GymDashboardController,
    GymMembersController,
  ],
  providers: [
    GymAttendanceService,
    GymMembershipService,
    GymDashboardService,
    SubscriptionCron,
  ],
})
export class GymModule {}
