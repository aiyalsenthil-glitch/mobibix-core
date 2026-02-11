import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private fromPaisa(amount: number | null | undefined): number | null {
    if (amount === null || amount === undefined) return null;
    return amount / 100;
  }

  async listByShop(
    tenantId: string,
    shopId: string,
    options?: { skip?: number; take?: number },
  ) {
    // Parallel queries for better performance
    const [products, total] = await Promise.all([
      this.prisma.shopProduct.findMany({
        where: {
          tenantId,
          shopId,
          isActive: true,
        },
        skip: options?.skip ?? 0,
        take: options?.take ?? 50,
        select: {
          id: true,
          name: true,
          category: true,
          salePrice: true,
          costPrice: true,
          isActive: true,
          hsnCode: true,
          gstRate: true,
          global: {
            select: {
              hsn: {
                select: {
                  code: true,
                  taxRate: true,
                },
              },
            },
          },
          stockEntries: {
            select: {
              type: true,
              quantity: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.shopProduct.count({
        where: { tenantId, shopId, isActive: true },
      }),
    ]);

    const mappedProducts = products.map((p) => {
      const stockQty = p.stockEntries.reduce((sum, e) => {
        return e.type === 'IN' ? sum + e.quantity : sum - e.quantity;
      }, 0);

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        hsnCode: p.hsnCode || p.global?.hsn?.code,
        gstRate: p.gstRate || p.global?.hsn?.taxRate,
        salePrice: this.fromPaisa(p.salePrice),
        costPrice: this.fromPaisa(p.costPrice),
        isActive: p.isActive,
        stockQty,
      };
    });

    return {
      data: mappedProducts,
      total,
      skip: options?.skip ?? 0,
      take: options?.take ?? 50,
    };
  }
  async findOne(tenantId: string, shopId: string, productId: string) {
    const product = await this.prisma.shopProduct.findUnique({
      where: { id: productId },
      include: {
        global: {
          select: {
            hsn: { select: { code: true, taxRate: true } },
          },
        },
        stockEntries: {
          select: { type: true, quantity: true },
        },
      },
    });

    if (
      !product ||
      product.shopId !== shopId ||
      product.tenantId !== tenantId
    ) {
      return null;
    }

    const stockQty = product.stockEntries.reduce((sum, e) => {
      return e.type === 'IN' ? sum + e.quantity : sum - e.quantity;
    }, 0);

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      hsnCode: product.hsnCode || product.global?.hsn?.code,
      gstRate: product.gstRate || product.global?.hsn?.taxRate,
      salePrice: this.fromPaisa(product.salePrice),
      costPrice: this.fromPaisa(product.costPrice),
      isActive: product.isActive,
      stockQty,
    };
  }

  /**
   * Bulk import products from CSV/Excel
   * @param tenantId - Tenant ID
   * @param shopId - Shop ID
   * @param products - Array of products to import
   * @param includeStock - Whether to create opening stock entries
   * @returns Import result with success/failed counts and errors
   */
  async bulkImport(
    tenantId: string,
    shopId: string,
    products: Array<{
      name: string;
      category?: string;
      type: 'GOODS' | 'SERVICE';
      sellingPrice: number;
      costPrice?: number;
      gstRate?: number;
      hsnCode?: string;
      sku?: string;
      openingStock?: number;
    }>,
    includeStock: boolean = false,
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
    duplicates: string[];
  }> {
    // Verify shop access
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
    });

    if (!shop) {
      throw new Error('Shop not found or access denied');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      duplicates: [] as string[],
    };

    // Fetch all existing products for this shop to check duplicates
    const existingProducts = await this.prisma.shopProduct.findMany({
      where: {
        tenantId,
        shopId,
        isActive: true,
      },
      select: {
        name: true,
        sku: true,
      },
    });

    const existingNames = new Set(
      existingProducts.map((p) => p.name.toLowerCase().trim()),
    );
    const existingSkus = new Set(
      existingProducts
        .filter((p) => p.sku)
        .map((p) => p.sku!.toLowerCase().trim()),
    );

    for (let i = 0; i < products.length; i++) {
      const productData = products[i];
      const rowNum = i + 2; // +2 because: +1 for array index, +1 for header row

      try {
        // Validate required fields
        if (!productData.name || productData.name.trim().length === 0) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: Product name is required`);
          continue;
        }

        // Check for duplicate by name
        const normalizedName = productData.name.toLowerCase().trim();
        if (existingNames.has(normalizedName)) {
          results.failed++;
          results.duplicates.push(productData.name);
          results.errors.push(
            `Row ${rowNum}: Product "${productData.name}" already exists`,
          );
          continue;
        }

        // Check for duplicate by SKU (if provided)
        if (productData.sku) {
          const normalizedSku = productData.sku.toLowerCase().trim();
          if (existingSkus.has(normalizedSku)) {
            results.failed++;
            results.duplicates.push(`SKU: ${productData.sku}`);
            results.errors.push(
              `Row ${rowNum}: SKU "${productData.sku}" already exists`,
            );
            continue;
          }
        }

        // Validate selling price
        if (productData.sellingPrice <= 0) {
          results.failed++;
          results.errors.push(
            `Row ${rowNum}: Selling price must be greater than 0`,
          );
          continue;
        }

        // Create product
        const createdProduct = await this.prisma.shopProduct.create({
          data: {
            tenantId,
            shopId,
            name: productData.name.trim(),
            type: productData.type || 'GOODS',
            category: productData.category?.trim() || 'Uncategorized',
            salePrice: Math.round(productData.sellingPrice * 100), // Convert to paise
            costPrice: productData.costPrice
              ? Math.round(productData.costPrice * 100)
              : null,
            gstRate: productData.gstRate || 0,
            hsnCode: productData.hsnCode?.trim() || null,
            sku: productData.sku?.trim() || null,
            isActive: true,
          },
        });

        // Add to existing names set to prevent duplicates within the same import
        existingNames.add(normalizedName);
        if (productData.sku) {
          existingSkus.add(productData.sku.toLowerCase().trim());
        }

        // If includeStock and openingStock provided, create stock entry
        if (
          includeStock &&
          productData.openingStock &&
          productData.openingStock > 0
        ) {
          await this.prisma.stockLedger.create({
            data: {
              tenantId,
              shopId,
              shopProductId: createdProduct.id,
              type: 'IN',
              quantity: productData.openingStock,
              referenceType: 'ADJUSTMENT',
              note: 'Opening Stock (Import)',
            },
          });
        }

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(
          `Row ${rowNum}: ${error.message || 'Failed to import product'}`,
        );
      }
    }

    return results;
  }

  /**
   * Export products to CSV format
   * @param tenantId - Tenant ID
   * @param shopId - Shop ID
   * @param includeStock - Whether to include current stock levels
   * @returns 2D array of CSV rows (first row is headers)
   */
  async exportProducts(
    tenantId: string,
    shopId: string,
    includeStock: boolean = false,
  ): Promise<string[][]> {
    // Verify shop access
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
      select: { id: true, name: true },
    });

    if (!shop) {
      throw new Error('Shop not found or access denied');
    }

    // Fetch products with stock entries if needed
    const products = await this.prisma.shopProduct.findMany({
      where: {
        tenantId,
        shopId,
        isActive: true,
      },
      include: includeStock
        ? {
            stockEntries: {
              select: {
                type: true,
                quantity: true,
              },
            },
          }
        : undefined,
      orderBy: { name: 'asc' },
    });

    // Build CSV headers
    const headers = [
      'Product Name',
      'Category',
      'Product Type',
      'Selling Price',
      'Cost Price',
      'GST Rate',
      'HSN Code',
      'SKU',
    ];

    if (includeStock) {
      headers.push('Current Stock');
    }

    // Build CSV rows
    const rows: string[][] = [headers];

    for (const product of products) {
      const row = [
        product.name,
        product.category || 'Uncategorized',
        product.type || 'GOODS',
        product.salePrice ? (product.salePrice / 100).toFixed(2) : '0', // Convert paise to rupees
        product.costPrice ? (product.costPrice / 100).toFixed(2) : '',
        product.gstRate?.toString() || '0',
        product.hsnCode || '',
        product.sku || '',
      ];

      if (includeStock) {
        // Calculate current stock balance
        const stockBalance =
          (product as any).stockEntries?.reduce((sum: number, entry: any) => {
            return entry.type === 'IN'
              ? sum + entry.quantity
              : sum - entry.quantity;
          }, 0) || 0;

        row.push(stockBalance.toString());
      }

      rows.push(row);
    }

    return rows;
  }
}
