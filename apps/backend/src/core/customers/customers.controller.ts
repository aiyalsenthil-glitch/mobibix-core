import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  BadRequestException,
  Param,
  Put,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UserRole, ModuleType } from '@prisma/client';
import { MergeCustomersDto } from './dto/merge-customers.dto';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

class CalculateDistanceDto {
  @IsString()
  shopPincode: string;

  @IsString()
  customerPincode: string;
}

@UseGuards(JwtAuthGuard, TenantRequiredGuard, GranularPermissionGuard)
@ModuleScope(ModuleType.CORE)
@ModulePermission('core')
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('core/customers')
export class CustomersController {
  constructor(
    private readonly service: CustomersService,
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.CREATE)
  @Post()
  async create(@Req() req, @Body() dto: CreateCustomerDto) {
    const tenantId = req.user.tenantId;

    return this.service.createCustomer(tenantId, dto);
  }
  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.UPDATE)
  @Put(':customerId')
  async update(
    @Req() req,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    const tenantId = req.user.tenantId;

    return this.service.updateCustomer(tenantId, customerId, dto);
  }
  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.DELETE)
  @Delete(':customerId')
  async delete(@Req() req, @Param('customerId') customerId: string) {
    const tenantId = req.user.tenantId;

    return this.service.deleteCustomer(tenantId, customerId);
  }

  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.UPDATE)
  @Roles(UserRole.OWNER)
  @Post('merge')
  async merge(@Req() req, @Body() dto: MergeCustomersDto) {
    const tenantId = req.user.tenantId;
    return this.service.mergeCustomers(tenantId, dto.sourceId, dto.targetId);
  }

  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.VIEW)
  @Get('by-phone')
  async getByPhone(@Req() req, @Query('phone') phone: string) {
    const tenantId = req.user.tenantId;
    if (!phone) {
      throw new BadRequestException('Invalid request');
    }

    return this.service.findByPhone(tenantId, phone);
  }

  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.VIEW)
  @Get('search')
  async search(
    @Req() req,
    @Query('query') query: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!query) {
      throw new BadRequestException('Invalid request');
    }

    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.service.searchCustomers(tenantId, query, limitNum);
  }

  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.VIEW)
  @Get()
  async getAll(
    @Req() req,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('lifecycle') lifecycle?: string,
    @Query('tags') tags?: string,
  ) {
    const tenantId = req.user.tenantId;

    return this.service.listCustomers(tenantId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      search,
      lifecycle: lifecycle || undefined,
      tags: tags ? tags.split(',').filter(Boolean) : undefined,
    });
  }

  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.VIEW)
  @Get(':customerId/stats')
  async getStats(@Req() req, @Param('customerId') customerId: string) {
    const tenantId = req.user.tenantId;
    return this.service.getCustomerStats(tenantId, customerId);
  }

  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.UPDATE)
  @Patch(':customerId/lifecycle')
  async updateLifecycle(
    @Req() req,
    @Param('customerId') customerId: string,
    @Body('lifecycle') lifecycle: string | null,
  ) {
    const tenantId = req.user.tenantId;
    return this.service.updateCustomerLifecycle(
      tenantId,
      customerId,
      lifecycle,
    );
  }

  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.UPDATE)
  @Patch(':customerId/tags')
  async updateTags(
    @Req() req,
    @Param('customerId') customerId: string,
    @Body('tags') tags: string[],
  ) {
    const tenantId = req.user.tenantId;
    return this.service.updateCustomerTags(tenantId, customerId, tags);
  }

  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.VIEW)
  @Get(':customerId/logs')
  async getLogs(
    @Req() req,
    @Param('customerId') customerId: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('product') product?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.service.getCustomerLogs(tenantId, customerId, {
      type: type as any,
      startDate,
      endDate,
      product,
    });
  }

  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.VIEW)
  @Get(':customerId')
  async getOne(@Req() req, @Param('customerId') customerId: string) {
    const tenantId = req.user.tenantId;

    return this.service.getCustomer(tenantId, customerId);
  }

  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.VIEW)
  @Post('calculate-distance')
  @HttpCode(HttpStatus.OK)
  async calculateDistance(@Body() dto: CalculateDistanceDto) {
    const apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('Google Maps API key not configured');
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json`;
    const response = await firstValueFrom(
      this.http.get(url, {
        params: {
          origins: dto.shopPincode,
          destinations: dto.customerPincode,
          mode: 'driving',
          key: apiKey,
        },
        timeout: 10000,
      }),
    );

    const element = response.data?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') {
      throw new BadRequestException(
        'Could not calculate distance. Please verify both pincodes.',
      );
    }

    const distanceKm = Math.round(element.distance.value / 1000);
    return { distanceKm };
  }
}
