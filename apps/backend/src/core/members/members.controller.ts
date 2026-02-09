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
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { TenantStatusGuard } from '../tenant/guards/tenant-status.guard';

@Controller('members')
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantStatusGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Permissions(Permission.MEMBER_VIEW)
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

  @Permissions(Permission.MEMBER_CREATE)
  @Post()
  create(@Req() req: any, @Body() dto: CreateMemberDto) {
    if (!req.user.tenantId) {
      throw new ForbiddenException('Tenant not initialized');
    }

    return this.membersService.createMember(
      req.user.tenantId,
      dto,
      req.user.sub,
    );
  }

  @Permissions(Permission.MEMBER_EDIT)
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
