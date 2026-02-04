import { Injectable } from '@nestjs/common';
import { ShopProductsService } from '../../../../core/shop-products/shop-products.service';

@Injectable()
export class RetailDemoCatalog {
  constructor(private readonly shopProductsService: ShopProductsService) {}

  async getFormattedCatalog(tenantId: string): Promise<string> {
    // 1. Fetch "Global Active" products via the existing service
    // Note: listCatalog returns { data: [...] }
    const result = await this.shopProductsService.listCatalog(tenantId, 'DUMMY_SHOP_ID'); 
    
    // For demo simplicity, we just list the first 5 global products
    const products = result.data.slice(0, 5);

    if (products.length === 0) {
      return '';
    }

    return products
      .map((p, index) => `${index + 1}. *${p.name}*`)
      .join('\n');
  }
}
