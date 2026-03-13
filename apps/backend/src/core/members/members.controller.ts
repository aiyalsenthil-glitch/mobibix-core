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
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { TenantStatusGuard } from '../tenant/guards/tenant-status.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('members')
@ModuleScope(ModuleType.GYM)
@ModulePermission('membership')
@UseGuards(
  JwtAuthGuard,
  TenantRequiredGuard,
  GranularPermissionGuard,
  TenantStatusGuard,
)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
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

  @RequirePermission(PERMISSIONS.GYM.MEMBER.CREATE)
  @Post()
  create(@Req() req: any, @Body() dto: CreateMemberDto) {
    // tenantId guaranteed by TenantRequiredGuard

    return this.membersService.createMember(
      req.user.tenantId,
      dto,
      req.user.sub,
    );
  }

  @RequirePermission(PERMISSIONS.GYM.MEMBER.EDIT)
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

  @RequirePermission(PERMISSIONS.GYM.MEMBER.EDIT)
  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.membersService.deleteMember(req.user, id);
  }
  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Get('stats/expiring-soon')
  countExpiring(@Req() req: any) {
    return this.membersService.countExpiringSoon(req.user.tenantId, 5);
  }

  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Get(':id/payments')
  getPayments(@Req() req: any, @Param('id') id: string) {
    return this.membersService.getMemberPayments(req.user.tenantId, id);
  }
  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Get('expired-today-count')
  countExpiredToday(@Req() req: any) {
    return this.membersService.countExpiredToday(req.user.tenantId);
  }

  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
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

  @RequirePermission(PERMISSIONS.GYM.MEMBER.VIEW)
  @Get(':id')
  getById(@Req() req: any, @Param('id') id: string) {
    return this.membersService.getMemberById(req.user.tenantId, id);
  }
}
