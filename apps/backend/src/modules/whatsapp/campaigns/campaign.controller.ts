import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/campaign.dto';

@Controller('whatsapp/campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  /**
   * POST /whatsapp/campaigns
   * Create a campaign in DRAFT status.
   */
  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  create(@Req() req, @Body() dto: CreateCampaignDto) {
    return this.campaignService.create(req.user.tenantId, dto);
  }

  /**
   * POST /whatsapp/campaigns/:id/launch
   * Enqueue the campaign for sending (DRAFT → RUNNING or SCHEDULED).
   */
  @Post(':id/launch')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  launch(@Req() req, @Param('id') id: string) {
    return this.campaignService.launch(id, req.user.tenantId);
  }

  /**
   * POST /whatsapp/campaigns/:id/cancel
   * Cancel a DRAFT, SCHEDULED, or RUNNING campaign.
   */
  @Post(':id/cancel')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  cancel(@Req() req, @Param('id') id: string) {
    return this.campaignService.cancel(id, req.user.tenantId);
  }

  /**
   * GET /whatsapp/campaigns
   * List campaigns for the tenant.
   */
  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  list(@Req() req) {
    return this.campaignService.list(req.user.tenantId);
  }

  /**
   * GET /whatsapp/campaigns/:id
   * Get full campaign detail.
   */
  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  getOne(@Req() req, @Param('id') id: string) {
    return this.campaignService.getOne(id, req.user.tenantId);
  }

  /**
   * GET /whatsapp/campaigns/:id/logs
   * Per-recipient send results (paginated).
   * ?page=1&status=FAILED
   */
  @Get(':id/logs')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  getLogs(
    @Req() req,
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('status') status?: string,
  ) {
    return this.campaignService.getLogs(id, req.user.tenantId, page, status);
  }
}
