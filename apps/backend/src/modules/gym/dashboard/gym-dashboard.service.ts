import { Injectable } from '@nestjs/common';
import { MembersService } from '../../../core/members/members.service';
import { GymAttendanceService } from '../attendance/gym-attendance.service';
import { GymMembershipService } from '../membership/gym-membership.service';

@Injectable()
export class GymDashboardService {
  constructor(
    private readonly membersService: MembersService,
    private readonly attendanceService: GymAttendanceService,
    private readonly membershipService: GymMembershipService,
  ) {}

  async getOwnerDashboard(tenantId: string) {
    const totalMembers = await this.membersService.countAll(tenantId);

    const todayAttendance =
      await this.attendanceService.countTodayAttendance(tenantId);

    const expiringSoon = await this.membershipService.countExpiringSoon(
      tenantId,
      3,
    );

    return {
      totalMembers,
      todayAttendance,
      expiringSoon,
    };
  }

  async getTodayAttendanceList(tenantId: string) {
    return this.attendanceService.listTodayAttendance(tenantId);
  }

  async getExpiringMemberships(tenantId: string, days: number = 3) {
    return this.membershipService.listExpiringSoon(tenantId, days);
  }
}
