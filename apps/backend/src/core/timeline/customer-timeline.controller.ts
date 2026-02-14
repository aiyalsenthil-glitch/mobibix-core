import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { CustomerTimelineService } from './customer-timeline.service';
import {
  CustomerTimelineResponseDto,
  GetCustomerTimelineDto,
} from './dto/timeline.dto';
import { TimelineSource, TimelineActivityType } from './timeline.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('core/customer-timeline')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class CustomerTimelineController {
  constructor(private readonly timelineService: CustomerTimelineService) {}

  /**
   * Get customer timeline
   * GET /api/core/customer-timeline/:customerId
   */
  @Get(':customerId')
  @HttpCode(HttpStatus.OK)
  async getCustomerTimeline(
    @Request() req: any,
    @Param('customerId') customerId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sources') sources?: string, // Comma-separated
    @Query('types') types?: string, // Comma-separated
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<CustomerTimelineResponseDto> {
    // Extract tenantId from JWT payload
    const tenantId = req.user.tenantId;

    const query: GetCustomerTimelineDto = {
      customerId,
      tenantId,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      sources: sources ? (sources.split(',') as TimelineSource[]) : undefined,
      types: types ? (types.split(',') as TimelineActivityType[]) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      shopId,
      sortOrder: sortOrder || 'DESC',
    };

    return this.timelineService.getCustomerTimeline(query);
  }

  /**
   * Get timeline statistics
   * GET /api/core/customer-timeline/:customerId/stats
   */
  @Get(':customerId/stats')
  @HttpCode(HttpStatus.OK)
  async getTimelineStats(
    @Request() req: any,
    @Param('customerId') customerId: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.timelineService.getTimelineStats(customerId, tenantId);
  }
}
