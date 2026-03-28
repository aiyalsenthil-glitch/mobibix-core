import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { GymModule as GymDashboardModule } from './dashboard/gym.module';

import { GymAttendanceController } from './attendance/gym-attendance.controller';
import { GymAttendanceService } from './attendance/gym-attendance.service';

import { GymMembershipController } from './membership/gym-membership.controller';
import { GymMembershipService } from './membership/gym-membership.service';
import { GymMembersController } from './gym-members.controller';
import { PublicCheckinModule } from './public-checkin/public-checkin.module';
import { PaymentsModule } from '../../core/billing//payments/payments.module';
import { PaymentsController } from './payments/payments.controller';
import { GymPlansController } from './plans/gym-plans.controller';
import { GymPlansService } from './plans/gym-plans.service';
import { GymExpensesController } from './expenses/gym-expenses.controller';
import { GymExpensesService } from './expenses/gym-expenses.service';

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
    GymMembersController,
    PaymentsController,
    GymPlansController,
    GymExpensesController,
  ],
  providers: [
    GymAttendanceService,
    GymMembershipService,
    GymPlansService,
    GymExpensesService,
  ],
})
export class GymModule {}
