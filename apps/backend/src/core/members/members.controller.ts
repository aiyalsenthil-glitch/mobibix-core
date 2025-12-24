import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/permissions.enum';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberPaymentStatus } from '@prisma/client';

@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Permissions(Permission.MEMBER_VIEW)
  @Get()
  list(@Req() req: any) {
    return this.membersService.listMembers(req.user.tenantId);
  }

  @Permissions(Permission.MEMBER_CREATE)
  @Post()
  create(@Req() req: any, @Body() dto: CreateMemberDto) {
    console.log('JWT USER:', req.user);
    if (!req.user.tenantId) {
      throw new ForbiddenException('Tenant not initialized');
    }
    return this.membersService.createMember(req.user.tenantId, dto);
  }

  @Permissions(Permission.MEMBER_EDIT)
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.updateMember(req.user.tenantId, id, dto);
  }

  @Permissions(Permission.MEMBER_EDIT)
  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.membersService.deleteMember(req.user, id);
  }
  @Permissions(Permission.MEMBER_VIEW)
  @Get('stats/expiring-soon')
  countExpiring(@Req() req: any) {
    return this.membersService.countExpiringSoon(req.user.tenantId, 5);
  }
  @Permissions(Permission.MEMBER_EDIT)
  @Post(':id/renew')
  renew(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      feeAmount: number;
      paymentStatus: MemberPaymentStatus;
      method?: string;
      reference?: string;
    },
  ) {
    return this.membersService.renewMembership(req.user.tenantId, id, body);
  }
  @Permissions(Permission.MEMBER_VIEW)
  @Get(':id/payments')
  getPayments(@Req() req: any, @Param('id') id: string) {
    return this.membersService.getMemberPayments(req.user.tenantId, id);
  }

  @Permissions(Permission.MEMBER_VIEW)
  @Get('filter/expiring-soon')
  listExpiring(@Req() req: any) {
    return this.membersService.listExpiringSoon(req.user.tenantId, 5);
  }
  @Permissions(Permission.MEMBER_VIEW)
  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    return this.membersService.getMemberById(req.user.tenantId, id);
  }
}
