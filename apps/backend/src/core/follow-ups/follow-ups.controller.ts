import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FollowUpsService } from './follow-ups.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { FollowUpQueryDto } from './dto/follow-up-query.dto';
import { FollowUpStatus, UserRole } from '@prisma/client';

@Controller('core/follow-ups')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class FollowUpsController {
  constructor(private readonly service: FollowUpsService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateFollowUpDto) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId || req.user.sub;
    const role = req.user.role;

    return this.service.createFollowUp(tenantId, userId, role, dto);
  }

  @Patch(':followUpId')
  async update(
    @Req() req: any,
    @Param('followUpId') followUpId: string,
    @Body() dto: UpdateFollowUpDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId || req.user.sub;
    const role = req.user.role;

    return this.service.updateFollowUp(tenantId, userId, role, followUpId, dto);
  }

  @Patch(':followUpId/status')
  async updateStatus(
    @Req() req: any,
    @Param('followUpId') followUpId: string,
    @Body('status') status: FollowUpStatus,
  ) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.sub;
    const role = req.user?.role as UserRole | undefined;

    if (!tenantId || !userId || !role || !status) {
      throw new BadRequestException('Invalid request');
    }

    return this.service.updateStatus(
      tenantId,
      userId,
      role,
      followUpId,
      status,
    );
  }

  @Get('my')
  async listMy(
    @Req() req: any,
    @Query() query: FollowUpQueryDto,
    @Query('notify') notify?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId || req.user.sub;

    const notifyOnDue = notify === 'true';
    return this.service.listMyFollowUps(tenantId, userId, query, notifyOnDue, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('counts')
  async getCounts(@Req() req: any) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId || req.user.sub;

    return this.service.getMyFollowUpCounts(tenantId, userId);
  }

  @Get('all')
  async listAll(
    @Req() req: any,
    @Query() query: FollowUpQueryDto,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId || req.user.sub;
    const role = req.user.role;

    return this.service.listAllFollowUps(tenantId, role, query, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }
}
