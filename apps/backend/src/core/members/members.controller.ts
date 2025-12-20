import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/permissions.enum';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  // ─────────────────────────────────────────────
  // CREATE MEMBER (OWNER + STAFF WITH PERMISSION)
  // ─────────────────────────────────────────────
  @Post()
  @Permissions(Permission.ADD_MEMBER)
  create(@Req() req: any, @Body() dto: CreateMemberDto) {
    return this.membersService.createMember(req.user.tenantId, dto);
  }

  // ─────────────────────────────────────────────
  // LIST MEMBERS (OWNER, ADMIN, STAFF)
  // ─────────────────────────────────────────────
  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.STAFF)
  list(@Req() req: any) {
    return this.membersService.listMembers(req.user.tenantId);
  }

  // ─────────────────────────────────────────────
  // GET SINGLE MEMBER (OWNER, ADMIN, STAFF)
  // ─────────────────────────────────────────────
  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.STAFF)
  getById(@Req() req: any, @Param('id') id: string) {
    return this.membersService.getMemberById(req.user.tenantId, id);
  }

  // ─────────────────────────────────────────────
  // Delete MEMBER (OWNER + STAFF WITH PERMISSION)
  // ─────────────────────────────────────────────
  @Delete(':id')
  @Permissions(Permission.DELETE_MEMBER)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.membersService.deleteMember(req.user, id);
  }

  // ─────────────────────────────────────────────
  // UPDATE MEMBER (OWNER + STAFF WITH PERMISSION)
  // ─────────────────────────────────────────────
  @Patch(':id')
  @Permissions(Permission.EDIT_MEMBER)
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.updateMember(req.user.tenantId, id, dto);
  }
}
