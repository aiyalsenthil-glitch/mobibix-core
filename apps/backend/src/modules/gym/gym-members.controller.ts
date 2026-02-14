import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Delete,
} from '@nestjs/common';
import { MembersService } from '../../core/members/members.service';
import { CreateMemberDto } from '../../core/members/dto/create-member.dto';
import { UpdateMemberDto } from '../../core/members/dto/update-member.dto';
import { RenewMemberDto } from '../../core/members/dto/renew-member.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/auth/guards/permissions.guard';
import { Permissions } from '../../core/auth/decorators/permissions.decorator';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { Permission } from '../../core/auth/permissions.enum';
import { UserRole, ModuleType } from '@prisma/client';
import { TenantStatusGuard } from '../../core/tenant/guards/tenant-status.guard';
import { TenantRequiredGuard } from '../../core/auth/guards/tenant.guard';
import { ModuleScope } from '../../core/auth/decorators/module-scope.decorator';

@Controller('gym/members')
@ModuleScope(ModuleType.GYM)
@Roles(UserRole.OWNER, UserRole.STAFF)
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
  TenantStatusGuard,
  TenantRequiredGuard,
)
export class GymMembersController {
  constructor(private readonly membersService: MembersService) {}

  // ======================
  // CREATE / ADMISSION
  // OWNER + STAFF
  // ======================
  @Permissions(Permission.MEMBER_CREATE)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Post()
  create(@Req() req: any, @Body() dto: CreateMemberDto) {
    return this.membersService.createMember(
      req.user.tenantId,
      dto,
      req.user.sub,
    );
  }
  // ======================
  // RENEWAL / EXPIRY LISTS
  // ======================
  @Permissions(Permission.MEMBER_VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get('renewal-due')
  listRenewalDue(@Req() req: any) {
    return this.membersService.listMembershipsDue(req.user.tenantId);
  }
  @Get('payment-due')
  getPaymentDue(@Req() req) {
    return this.membersService.getPaymentDueMembers(req.user.tenantId);
  }

  @Permissions(Permission.MEMBER_VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get('expiring-soon')
  listExpiringSoon(@Req() req: any, @Query('days') days = '7') {
    return this.membersService.listExpiringSoon(
      req.user.tenantId,
      Number(days),
    );
  }
  // ======================
  // DELETE MEMBER
  // OWNER ONLY
  // ======================
  @Permissions(Permission.MEMBER_EDIT)
  @Roles(UserRole.OWNER)
  @Delete(':id')
  async delete(@Req() req: any, @Param('id') memberId: string) {
    return this.membersService.deleteMember(req.user, memberId);
  }

  // ======================
  // LIST ALL MEMBERS
  // OWNER + STAFF
  // ======================
  @Permissions(Permission.MEMBER_VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get()
  list(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    return this.membersService.listMembers(req.user.tenantId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      search,
    });
  }

  @Patch(':id/owner-edit')
  async updateMemberByOwner(
    @Req() req,
    @Param('id') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.updateMemberByOwner(
      req.user.tenantId,
      req.user.userId,
      req.user.role,
      memberId,
      dto,
    );
  }

  // ======================
  // UPDATE MEMBER
  // OWNER + STAFF (admission fixes)
  // ======================
  @Permissions(Permission.MEMBER_EDIT)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.updateMember(
      req.user.tenantId,
      id,
      dto,
      req.user.sub,
    );
  }

  // ======================
  // RENEW MEMBERSHIP (🔥 FIXED)
  // ======================
  @Permissions(Permission.MEMBER_EDIT)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Post(':id/renew')
  renewMember(
    @Req() req: any,
    @Param('id') memberId: string,
    @Body() dto: RenewMemberDto,
  ) {
    // ✅ IMPORTANT: use sub, NOT userId
    return this.membersService.renewMembership(
      req.user.tenantId,
      req.user.sub, // ✅ THIS FIXES EVERYTHING
      req.user.role,
      memberId,
      dto,
    );
  }
  //Summary for Web View
  @Get('summary')
  async listMembersSummary(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.membersService.listMembersWithStatus(tenantId);
  }

  // ======================
  // PAYMENT HISTORY
  // ======================
  @Permissions(Permission.MEMBER_VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get(':id/payments')
  getPayments(@Req() req: any, @Param('id') id: string) {
    return this.membersService.getMemberPayments(req.user.tenantId, id);
  }

  @Permissions(Permission.MEMBER_VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get('expired-today')
  expiredToday(@Req() req: any) {
    return this.membersService.countExpiredToday(req.user.tenantId);
  }

  // ======================
  // PAYMENT PENDING
  // ======================
  @Permissions(Permission.MEMBER_VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get('payment-pending')
  paymentPending(@Req() req: any) {
    return this.membersService.getPaymentsPending(req.user.tenantId);
  }

  // ======================
  // SEARCH BY PHONE
  // ======================
  @Permissions(Permission.MEMBER_VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get('search')
  async searchByPhone(@Req() req: any, @Query('phone') phone: string) {
    if (!phone) {
      throw new BadRequestException('phone is required');
    }

    const member = await this.membersService.findByPhone(
      req.user.tenantId,
      phone,
    );

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }
  @Post('collect-payment')
  async collectPayment(
    @Req() req,
    @Body() body: { memberId: string; amount: number },
  ) {
    return this.membersService.collectPayment(
      req.user.tenantId,
      body.memberId,
      body.amount,
    );
  }

  // ======================
  // GET MEMBER BY ID
  // ======================
  @Permissions(Permission.MEMBER_VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    return this.membersService.getMemberById(req.user.tenantId, id);
  }
}
