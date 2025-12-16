import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';

@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  // ─────────────────────────────────────────────
  // CREATE MEMBER (OWNER, ADMIN)
  // ─────────────────────────────────────────────
  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
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
  // UPDATE MEMBER (OWNER, ADMIN)
  // ─────────────────────────────────────────────
  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.updateMember(req.user.tenantId, id, dto);
  }
}
