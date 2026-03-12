import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { GlobalProductsService } from './global-products.service';
import { CreateGlobalProductDto } from './dto/create-global-product.dto';
import { UpdateGlobalProductDto } from './dto/update-global-product.dto';
import { SearchGlobalProductsDto } from './dto/search-global-products.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModuleType } from '@prisma/client';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('global-products')
@ModuleScope(ModuleType.CORE)
@ModulePermission('system')
@UseGuards(JwtAuthGuard, GranularPermissionGuard)
export class GlobalProductsController {
  constructor(private readonly globalProductsService: GlobalProductsService) {}

  /**
   * POST /api/global-products
   * Create a new global product
   */
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateGlobalProductDto) {
    return await this.globalProductsService.create(dto);
  }

  /**
   * GET /api/global-products
   * List all global products with search
   */
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get()
  async findAll(@Query() query: SearchGlobalProductsDto) {
    return await this.globalProductsService.findAll(query);
  }

  /**
   * GET /api/global-products/:id
   * Get global product details
   */
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.globalProductsService.findOne(id);
  }

  /**
   * PATCH /api/global-products/:id
   * Update global product
   */
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateGlobalProductDto) {
    return await this.globalProductsService.update(id, dto);
  }

  /**
   * DELETE /api/global-products/:id
   * Delete global product
   */
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return await this.globalProductsService.delete(id);
  }
}
