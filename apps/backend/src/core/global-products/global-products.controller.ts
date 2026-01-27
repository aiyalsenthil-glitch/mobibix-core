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
} from '@nestjs/common';
import { GlobalProductsService } from './global-products.service';
import { CreateGlobalProductDto } from './dto/create-global-product.dto';
import { UpdateGlobalProductDto } from './dto/update-global-product.dto';
import { SearchGlobalProductsDto } from './dto/search-global-products.dto';

@Controller('global-products')
export class GlobalProductsController {
  constructor(private readonly globalProductsService: GlobalProductsService) {}

  /**
   * POST /api/global-products
   * Create a new global product
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateGlobalProductDto) {
    return await this.globalProductsService.create(dto);
  }

  /**
   * GET /api/global-products
   * List all global products with search
   */
  @Get()
  async findAll(@Query() query: SearchGlobalProductsDto) {
    return await this.globalProductsService.findAll(query);
  }

  /**
   * GET /api/global-products/:id
   * Get global product details
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.globalProductsService.findOne(id);
  }

  /**
   * PATCH /api/global-products/:id
   * Update global product
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateGlobalProductDto) {
    return await this.globalProductsService.update(id, dto);
  }

  /**
   * DELETE /api/global-products/:id
   * Delete global product
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return await this.globalProductsService.delete(id);
  }
}
