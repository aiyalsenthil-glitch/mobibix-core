import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomerTimelineService } from './customer-timeline.service';
import {
  CustomerTimelineResponseDto,
  GetCustomerTimelineDto,
} from './dto/timeline.dto';
import { TimelineSource, TimelineActivityType } from './timeline.enum';

// Assuming you have JWT auth guard
// import { JwtAuthGuard } from 'src/core/auth/jwt-auth.guard';
// import { GetUser } from 'src/core/auth/get-user.decorator';

@Controller('api/crm/timeline')
// @UseGuards(JwtAuthGuard) // Uncomment when auth is ready
export class CustomerTimelineController {
  constructor(private readonly timelineService: CustomerTimelineService) {}

  /**
   * Get customer timeline
   * GET /api/crm/timeline/:customerId
   */
  @Get(':customerId')
  @HttpCode(HttpStatus.OK)
  async getCustomerTimeline(
    @Param('customerId') customerId: string,
    @Query('tenantId') tenantId: string, // TODO: Get from auth user
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sources') sources?: string, // Comma-separated
    @Query('types') types?: string, // Comma-separated
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shopId') shopId?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<CustomerTimelineResponseDto> {
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
   * GET /api/crm/timeline/:customerId/stats
   */
  @Get(':customerId/stats')
  @HttpCode(HttpStatus.OK)
  async getTimelineStats(
    @Param('customerId') customerId: string,
    @Query('tenantId') tenantId: string, // TODO: Get from auth user
  ) {
    return this.timelineService.getTimelineStats(customerId, tenantId);
  }
}
