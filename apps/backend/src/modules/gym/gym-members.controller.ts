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
import { PrismaService } from '../../core/prisma/prisma.service';
import { MembersService } from '../../core/members/members.service';
import { CreateMemberDto } from '../../core/members/dto/create-member.dto';
import { UpdateMemberDto } from '../../core/members/dto/update-member.dto';
import { RenewMemberDto } from '../../core/members/dto/renew-member.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { TenantStatusGuard } from '../../core/tenant/guards/tenant-status.guard';
import { TenantRequiredGuard } from '../../core/auth/guards/tenant.guard';
import { ModuleScope } from '../../core/auth/decorators/module-scope.decorator';
import { GranularPermissionGuard } from '../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../security/permission-registry';
import { RolesGuard } from '../../core/auth/guards/roles.guard';

@Controller('gym/members')
@ModuleScope(ModuleType.GYM)
@ModulePermission('member')
@Roles(UserRole.OWNER, UserRole.STAFF)
@UseGuards(
  JwtAuthGuard,
  TenantRequiredGuard,
  RolesGuard,
  GranularPermissionGuard,
  TenantStatusGuard,
)
export class GymMembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly prisma: PrismaService,
  ) {}

  // ======================
  // CREATE / ADMISSION
  // OWNER + STAFF
  // ======================
  @RequirePermission(PERMISSIONS.GYM.MEMBER.CREATE)
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
  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get('renewal-due')
  listRenewalDue(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.membersService.listMembershipsDue(req.user.tenantId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }
  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get('payment-due')
  getPaymentDue(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.membersService.getPaymentDueMembers(req.user.tenantId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
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
  @RequirePermission(PERMISSIONS.GYM.MEMBER.EDIT)
  @Roles(UserRole.OWNER)
  @Delete(':id')
  async delete(@Req() req: any, @Param('id') memberId: string) {
    return this.membersService.deleteMember(req.user, memberId);
  }

  // ======================
  // LIST ALL MEMBERS
  // OWNER + STAFF
  // ======================
  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
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

  @RequirePermission(PERMISSIONS.GYM.MEMBER.EDIT)
  @Roles(UserRole.OWNER)
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
  @RequirePermission(PERMISSIONS.GYM.MEMBER.EDIT)
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
  @RequirePermission(PERMISSIONS.GYM.MEMBER.EDIT)
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
  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get('summary')
  async listMembersSummary(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.membersService.listMembersWithStatus(tenantId);
  }

  // ======================
  // PAYMENT HISTORY
  // ======================
  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get(':id/payments')
  getPayments(@Req() req: any, @Param('id') id: string) {
    return this.membersService.getMemberPayments(req.user.tenantId, id);
  }

  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get('expired-today')
  expiredToday(@Req() req: any) {
    return this.membersService.countExpiredToday(req.user.tenantId);
  }

  // ======================
  // PAYMENT PENDING
  // ======================
  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get('payment-pending')
  paymentPending(@Req() req: any) {
    return this.membersService.getPaymentsPending(req.user.tenantId);
  }

  // ======================
  // SEARCH BY PHONE
  // ======================
  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
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
  @RequirePermission(PERMISSIONS.GYM.PAYMENT.COLLECT)
  @Roles(UserRole.OWNER, UserRole.STAFF)
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
  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    return this.membersService.getMemberById(req.user.tenantId, id);
  }

  // ======================
  // FREEZE / UNFREEZE
  // ======================
  @RequirePermission(PERMISSIONS.GYM.MEMBER.CREATE)
  @Roles(UserRole.OWNER)
  @Post(':id/freeze')
  freeze(@Req() req: any, @Param('id') id: string) {
    return this.membersService.freezeMember(req.user.tenantId, id);
  }

  @RequirePermission(PERMISSIONS.GYM.MEMBER.CREATE)
  @Roles(UserRole.OWNER)
  @Post(':id/unfreeze')
  unfreeze(@Req() req: any, @Param('id') id: string) {
    return this.membersService.unfreezeMember(req.user.tenantId, id);
  }

  // ======================
  // GST RECEIPT
  // ======================
  /**
   * GET /gym/members/payment/:paymentId/receipt
   * Returns all data needed to render a GST receipt PDF / printable page.
   */
  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get('payment/:paymentId/receipt')
  async getPaymentReceipt(@Req() req: any, @Param('paymentId') paymentId: string) {
    const tenantId = req.user.tenantId;

    const payment = await this.prisma.memberPayment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        member: {
          select: {
            fullName: true,
            phone: true,
            membershipStartAt: true,
            membershipEndAt: true,
            membershipPlanId: true,
          },
        },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        legalName: true,
        gstNumber: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        pincode: true,
        contactPhone: true,
        contactEmail: true,
        logoUrl: true,
      },
    });

    const baseAmount = payment.amount; // paise
    const gstRate = payment.gstRate ?? 0;
    const gstAmount = payment.gstAmount ?? 0;
    const total = payment.total ?? baseAmount;
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;

    return {
      receiptNo: `REC-${payment.id.slice(-8).toUpperCase()}`,
      date: payment.createdAt,
      gym: tenant,
      member: {
        name: payment.member.fullName,
        phone: payment.member.phone,
      },
      payment: {
        id: payment.id,
        method: payment.method ?? 'CASH',
        durationDays: payment.durationDays,
        membershipStart: payment.member.membershipStartAt,
        membershipEnd: payment.member.membershipEndAt,
        baseAmountRupees: baseAmount / 100,
        gstRate,
        cgstRupees: cgst / 100,
        sgstRupees: sgst / 100,
        gstAmountRupees: gstAmount / 100,
        totalRupees: total / 100,
        hasGst: gstRate > 0,
      },
    };
  }

  // ======================
  // UPI PAYMENT LINK
  // ======================
  /**
   * GET /gym/members/:id/upi-payment
   * Returns UPI deep-link URI + QR data for the member's due amount.
   * Owner displays QR on screen — member scans with Google Pay / PhonePe / Paytm.
   * Zero fees: money goes directly to owner's UPI ID.
   */
  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get(':id/upi-payment')
  async getUpiPaymentLink(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user.tenantId;

    const [member, tenant] = await Promise.all([
      this.prisma.member.findFirst({
        where: { id, tenantId },
        select: { id: true, fullName: true, feeAmount: true, paidAmount: true, paymentStatus: true },
      }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { gymUpiId: true, name: true },
      }),
    ]);

    if (!member) throw new NotFoundException('Member not found');
    if (!tenant?.gymUpiId) throw new BadRequestException('UPI ID not configured. Go to Settings → Gym Profile to add your UPI ID.');

    const dueAmount = Math.max(0, (member.feeAmount - member.paidAmount) / 100); // paise → rupees
    const note = `Membership-${member.fullName.replace(/\s+/g, '-')}`;

    // UPI deep-link URI (works with all UPI apps)
    const upiUri = `upi://pay?pa=${encodeURIComponent(tenant.gymUpiId)}&pn=${encodeURIComponent(tenant.name)}&am=${dueAmount.toFixed(2)}&tn=${encodeURIComponent(note)}&cu=INR`;

    return {
      upiId: tenant.gymUpiId,
      gymName: tenant.name,
      memberName: member.fullName,
      dueAmount,
      currency: 'INR',
      note,
      upiUri,
      // QR content is the same URI — frontend encodes it with a QR library
      qrContent: upiUri,
    };
  }
}
