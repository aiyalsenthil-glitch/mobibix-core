import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MembersService } from '../../core/members/members.service';
import { CreateMemberDto } from '../../core/members/dto/create-member.dto';
import { UpdateMemberDto } from '../../core/members/dto/update-member.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { Role } from '../../core/auth/roles.enum';

@Controller('gym/members')
@UseGuards(JwtAuthGuard)
export class GymMembersController {
  constructor(private readonly membersService: MembersService) {}

  // Gym creates a member (OWNER, ADMIN)
  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  create(@Req() req: any, @Body() dto: CreateMemberDto) {
    return this.membersService.createMember(req.user.tenantId, dto);
  }

  // Gym lists members (OWNER, ADMIN, STAFF)
  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.STAFF)
  list(@Req() req: any) {
    return this.membersService.listMembers(req.user.tenantId);
  }

  // Gym gets single member
  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.STAFF)
  getById(@Req() req: any, @Param('id') id: string) {
    return this.membersService.getMemberById(req.user.tenantId, id);
  }

  // Gym updates member (OWNER, ADMIN)
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
