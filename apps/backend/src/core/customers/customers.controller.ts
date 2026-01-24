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
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('core/customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Post()
  async create(@Req() req, @Body() dto: CreateCustomerDto) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }

    return this.service.createCustomer(tenantId, dto);
  }
  @Put(':customerId')
  async update(
    @Req() req,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }

    return this.service.updateCustomer(tenantId, customerId, dto);
  }
  @Delete(':customerId')
  async delete(@Req() req, @Param('customerId') customerId: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }

    return this.service.deleteCustomer(tenantId, customerId);
  }

  @Get('by-phone')
  async getByPhone(@Req() req, @Query('phone') phone: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId || !phone) {
      throw new BadRequestException('Invalid request');
    }

    return this.service.findByPhone(tenantId, phone);
  }

  @Get()
  async getAll(@Req() req) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }

    return this.service.listCustomers(tenantId);
  }

  @Get(':customerId')
  async getOne(@Req() req, @Param('customerId') customerId: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }

    return this.service.getCustomer(tenantId, customerId);
  }
}
