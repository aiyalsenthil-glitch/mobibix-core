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
  NotFoundException,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/permissions.enum';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { RenewMemberDto } from './dto/renew-member.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('members')
@UseGuards(JwtAuthGuard, PermissionsGuard)
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
  @Post(':id/renew')
  @Permissions(Permission.MEMBER_EDIT)
  renew(@Req() req: any, @Param('id') id: string, @Body() dto: RenewMemberDto) {
    return this.membersService.renewMembership(req.user.tenantId, id, dto);
  }

  @Permissions(Permission.MEMBER_VIEW)
  @Get(':id/payments')
  getPayments(@Req() req: any, @Param('id') id: string) {
    return this.membersService.getMemberPayments(req.user.tenantId, id);
  }
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.MEMBER_VIEW)
  @Get('expired-today-count')
  countExpiredToday(@Req() req: any) {
    return this.membersService.countExpiredToday(req.user.tenantId);
  }
  @Get('filter/expired-today')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.MEMBER_VIEW)
  expiredToday(@Req() req: any) {
    return this.membersService.findExpiredToday(req.user.tenantId);
  }
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.MEMBER_VIEW)
  @Get('filter/expiring-soon')
  getExpiringSoon(@Req() req: any, @Query('days') days?: string) {
    const limitDays = Number(days ?? 5); // default 5 days
    return this.membersService.findExpiringSoon(req.user.tenantId, limitDays);
  }
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.MEMBER_VIEW)
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

  @Permissions(Permission.MEMBER_VIEW)
  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    return this.membersService.getMemberById(req.user.tenantId, id);
  }
}
