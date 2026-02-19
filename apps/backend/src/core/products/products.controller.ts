import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  Param,
  Res,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { ModuleType, UserRole } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ProductsService } from './products.service';
import { ImportProductDto } from './dto/import-product.dto';
import { Roles } from '../auth/decorators/roles.decorator';

// Local interface for Multer file since global Express.Multer.File 
// might not be available in all environments depending on TS configuration
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@UseGuards(JwtAuthGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
@ModuleScope(ModuleType.MOBILE_SHOP)
@Controller('mobileshop/products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  async list(
    @Req() req,
    @Query('shopId') shopId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }

    // TEMP: tenantId from request (same pattern as jobcard)
    const tenantId = req.user.tenantId;

    return this.service.listByShop(tenantId, shopId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  async getOne(
    @Req() req,
    @Param('id') id: string,
    @Query('shopId') shopId: string,
  ) {
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }
    const tenantId = req.user.tenantId;
    return this.service.findOne(tenantId, shopId, id);
  }

  /**
   * POST /mobileshop/products/import
   * Bulk import products from CSV/Excel file
   *
   * Form data:
   * - file: CSV/Excel file
   * - shopId: Shop ID
   * - includeStock: "true" or "false" (whether to include opening stock)
   *
   * PHASE 3 SECURITY: File upload validation with ParseFilePipe
   * - Max file size: 5MB
   * - Allowed types: CSV and Excel files only
   */
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importProducts(
    @Req() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({
            fileType:
              /(text\/csv|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)/,
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: MulterFile,
    @Body() body: { shopId: string; includeStock: string },
  ) {
    const tenantId = req.user.tenantId;

    if (!body.shopId) {
      throw new BadRequestException('shopId is required');
    }

    // Additional security: Validate file extension matches content
    const filename = file.originalname.toLowerCase();
    const hasValidExtension =
      filename.endsWith('.csv') ||
      filename.endsWith('.xls') ||
      filename.endsWith('.xlsx');

    if (!hasValidExtension) {
      throw new BadRequestException(
        'Invalid file extension. Only .csv, .xls, and .xlsx files are allowed',
      );
    }

    // Parse CSV file
    const products = await this.parseCSV(file.buffer.toString('utf-8'));

    if (products.length === 0) {
      throw new BadRequestException(
        'No valid products found in file. Please check the format',
      );
    }

    // Import products with duplicate prevention
    const includeStock = body.includeStock === 'true';
    const results = await this.service.bulkImport(
      tenantId,
      body.shopId,
      products,
      includeStock,
    );

    return {
      ...results,
      total: products.length,
      message: `Import completed: ${results.success} successful, ${results.failed} failed`,
    };
  }

  /**
   * GET /mobileshop/products/export
   * Export products as CSV file
   *
   * Query params:
   * - shopId: Shop ID (required)
   * - includeStock: "true" or "false" (whether to include current stock levels)
   */
  @Get('export')
  async exportProducts(
    @Req() req,
    @Query('shopId') shopId: string,
    @Query('includeStock') includeStock: string,
    @Res() res: Response,
  ) {
    const tenantId = req.user.tenantId;

    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }

    // Get products as CSV rows
    const includeStockBool = includeStock === 'true';
    const rows = await this.service.exportProducts(
      tenantId,
      shopId,
      includeStockBool,
    );

    // Convert to CSV string
    const csvContent = rows
      .map((row) => row.map(this.escapeCSV).join(','))
      .join('\n');

    // Set response headers for file download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `products_export_${timestamp}${includeStockBool ? '_with_stock' : ''}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // UTF-8 BOM for Excel compatibility
    res.send('\uFEFF' + csvContent);
  }

  /**
   * Parse CSV file to product array
   * Handles both comma and semicolon separators
   */
  private async parseCSV(content: string): Promise<ImportProductDto[]> {
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      throw new BadRequestException('CSV file is empty or has no data rows');
    }

    // Skip header row
    const dataLines = lines.slice(1);

    const products: ImportProductDto[] = [];

    for (const line of dataLines) {
      const columns = this.parseCSVLine(line);

      // Skip rows with insufficient data
      if (columns.length < 3) {
        continue;
      }

      // Map CSV columns to product DTO
      // Expected format: Name, Category, Type, Selling Price, Cost Price, GST Rate, HSN Code, SKU, Opening Stock
      const product: ImportProductDto = {
        name: columns[0]?.trim(),
        category: columns[1]?.trim() || 'Uncategorized',
        type: (columns[2]?.trim().toUpperCase() === 'SERVICE'
          ? 'SERVICE'
          : 'GOODS') as any,
        sellingPrice: this.parseNumber(columns[3]) || 0,
        costPrice: this.parseNumber(columns[4]),
        gstRate: this.parseNumber(columns[5]) || 0,
        hsnCode: columns[6]?.trim() || undefined,
        sku: columns[7]?.trim() || undefined,
        openingStock: this.parseNumber(columns[8]) || 0,
      };

      // Only add if name is present
      if (product.name && product.name.length > 0) {
        products.push(product);
      }
    }

    return products;
  }

  /**
   * Parse CSV line handling quoted fields and commas inside quotes
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Push the last field
    result.push(current.trim());
    return result;
  }

  /**
   * Escape CSV field (wrap in quotes if contains comma/quote/newline)
   */
  private escapeCSV(field: string): string {
    if (!field) return '';

    const needsQuotes =
      field.includes(',') ||
      field.includes('"') ||
      field.includes('\n') ||
      field.includes('\r');

    if (needsQuotes) {
      return `"${field.replace(/"/g, '""')}"`;
    }

    return field;
  }

  /**
   * Parse number from string, handling empty strings
   */
  private parseNumber(value: string | undefined): number | undefined {
    if (!value || value.trim().length === 0) {
      return undefined;
    }
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }
}
