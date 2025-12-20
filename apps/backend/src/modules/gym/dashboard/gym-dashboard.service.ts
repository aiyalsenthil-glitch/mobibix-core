import { Injectable } from '@nestjs/common';
import { MembersService } from '../../../core/members/members.service';
import { GymMembershipService } from '../membership/gym-membership.service';
import { GymAttendanceService } from '../attendance/gym-attendance.service';

@Injectable()
export class GymDashboardService {
  constructor(
    private readonly membersService: MembersService,
    private readonly membershipService: GymMembershipService,
    private readonly attendanceService: GymAttendanceService,
  ) {}

  async getOwnerDashboard() {
    const totalMembers = await this.membersService.countAll();
    const todayAttendance = await this.attendanceService.countTodayAttendance();
    const expiringSoon = await this.membershipService.countExpiringSoon(3);

    return {
      metrics: {
        totalMembers,
        todayAttendance,
        expiringSoon,
      },
    };
  }
  async todayAttendanceList() {
    return this.attendanceService.listTodayAttendance();
  }
  async listExpiringSoon(days = 3) {
    return this.membershipService.listExpiringSoon(days);
  }
}
