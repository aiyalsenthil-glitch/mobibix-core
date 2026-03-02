import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  BadRequestException,
  Param,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UserRole } from '@prisma/client';
import { MergeCustomersDto } from './dto/merge-customers.dto';

@UseGuards(JwtAuthGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('core/customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Post()
  async create(@Req() req, @Body() dto: CreateCustomerDto) {
    const tenantId = req.user.tenantId;

    return this.service.createCustomer(tenantId, dto);
  }
  @Put(':customerId')
  async update(
    @Req() req,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    const tenantId = req.user.tenantId;

    return this.service.updateCustomer(tenantId, customerId, dto);
  }
  @Delete(':customerId')
  async delete(@Req() req, @Param('customerId') customerId: string) {
    const tenantId = req.user.tenantId;

    return this.service.deleteCustomer(tenantId, customerId);
  }

  @Post('merge')
  @Roles(UserRole.OWNER)
  async merge(@Req() req, @Body() dto: MergeCustomersDto) {
    const tenantId = req.user.tenantId;
    return this.service.mergeCustomers(tenantId, dto.sourceId, dto.targetId);
  }

  @Get('by-phone')
  async getByPhone(@Req() req, @Query('phone') phone: string) {
    const tenantId = req.user.tenantId;
    if (!phone) {
      throw new BadRequestException('Invalid request');
    }

    return this.service.findByPhone(tenantId, phone);
  }

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

  @Get()
  async getAll(
    @Req() req,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    const tenantId = req.user.tenantId;

    return this.service.listCustomers(tenantId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      search,
    });
  }

  @Get(':customerId')
  async getOne(@Req() req, @Param('customerId') customerId: string) {
    const tenantId = req.user.tenantId;

    return this.service.getCustomer(tenantId, customerId);
  }
}
