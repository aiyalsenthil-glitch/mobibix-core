import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { TenantProductsService } from './tenant-products.service';
import { CreateTenantProductDto } from './dto/create-tenant-product.dto';
import { UpdateTenantProductDto } from './dto/update-tenant-product.dto';

@Controller('tenant-products')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class TenantProductsController {
  constructor(private readonly service: TenantProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() dto: CreateTenantProductDto) {
    return await this.service.create(req.user.tenantId, req.user.role, dto);
  }

  @Get()
  async list(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return await this.service.findAll(req.user.tenantId, {
      search,
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 50,
    });
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTenantProductDto,
  ) {
    return await this.service.update(req.user.tenantId, req.user.role, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disable(@Req() req: any, @Param('id') id: string) {
    await this.service.disable(req.user.tenantId, req.user.role, id);
    return;
  }
}
