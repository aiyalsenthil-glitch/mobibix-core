import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Role } from '../../../core/auth/roles.enum';
import { GymMembershipService } from './gym-membership.service';

@Controller('gym/membership')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GymMembershipController {
  constructor(private readonly service: GymMembershipService) {}

  /**
   * Create / Renew membership
   */
  @Post()
  @Roles(Role.OWNER, Role.STAFF)
  async createMembership(
    @Req() req: any,
    @Body('memberId') memberId: string,
    @Body('durationDays') durationDays: number,
  ) {
    return this.service.createMembership(
      req.user.tenantId,
      memberId,
      durationDays,
    );
  }
}
