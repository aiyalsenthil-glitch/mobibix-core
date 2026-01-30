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
} from '@nestjs/common';
import { FollowUpsService } from './follow-ups.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { FollowUpQueryDto } from './dto/follow-up-query.dto';
import { FollowUpStatus, UserRole } from '@prisma/client';

@Controller('core/follow-ups')
export class FollowUpsController {
  constructor(private readonly service: FollowUpsService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateFollowUpDto) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.sub;
    const role = req.user?.role as UserRole | undefined;

    if (!tenantId || !userId || !role) {
      throw new BadRequestException('Invalid user context');
    }

    return this.service.createFollowUp(tenantId, userId, role, dto);
  }

  @Patch(':followUpId')
  async update(
    @Req() req: any,
    @Param('followUpId') followUpId: string,
    @Body() dto: UpdateFollowUpDto,
  ) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.sub;
    const role = req.user?.role as UserRole | undefined;

    if (!tenantId || !userId || !role) {
      throw new BadRequestException('Invalid user context');
    }

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
  ) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.sub;

    if (!tenantId || !userId) {
      throw new BadRequestException('Invalid user context');
    }

    const notifyOnDue = notify === 'true';
    return this.service.listMyFollowUps(tenantId, userId, query, notifyOnDue);
  }

  @Get('all')
  async listAll(@Req() req: any, @Query() query: FollowUpQueryDto) {
    const tenantId = req.user?.tenantId;
    const role = req.user?.role as UserRole | undefined;

    if (!tenantId || !role) {
      throw new BadRequestException('Invalid user context');
    }

    return this.service.listAllFollowUps(tenantId, role, query);
  }
}
