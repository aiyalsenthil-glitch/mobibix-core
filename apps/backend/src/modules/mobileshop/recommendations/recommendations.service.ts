import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CompatibilityService } from '../compatibility/compatibility.service';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  
  constructor(
    private prisma: PrismaService,
    private compatibilityService: CompatibilityService
  ) {}

  /**
   * Returns inventory items from the shop that are compatible with the specified phone model.
   * Focuses on upsell items (Accessories, Spares) that are currently in stock.
   */
  async getUpsellRecommendations(shopId: string, modelName: string, type?: string) {
    if (!modelName || modelName.trim().length < 2) return [];

    try {
      // 1. Fetch compatibility data from the engine
      const results = await this.compatibilityService.searchCompatibleParts(modelName);
      
      // 2. Identify all ShopProduct IDs that are compatible and in stock
      const recommendations: any[] = [];
      const { compatibleParts } = results;

      // Flatten groups and filter for inventory items with stock
      for (const partType in compatibleParts) {
        const items = compatibleParts[partType];
        
        // Filter by type if provided (e.g., only show SPARE for repairs)
        const inStockItems = items.filter(i => 
          i.source === 'INVENTORY' && 
          i.quantity > 0 &&
          (!type || i.type === type)
        );

        // Add to the final list, including the PartType (category) for the UI
        inStockItems.forEach(item => {
          recommendations.push({
            ...item,
            category: partType
          });
        });
      }

      // 3. Fallback: If no compatible inventory found, suggest best-selling accessories in the shop
      // This ensures the sidebar is never empty
      if (recommendations.length < 3) {
        const fallbackItems = await this.prisma.shopProduct.findMany({
          where: {
            shopId,
            isActive: true,
            quantity: { gt: 0 },
            category: { in: ['TEMPERED_GLASS', 'BACK_COVER', 'CHARGER', 'CABLE', 'HEADPHONES'] },
            id: { notIn: recommendations.map(r => r.id) }
          },
          take: 5 - recommendations.length,
          orderBy: { quantity: 'desc' }
        });

        fallbackItems.forEach(item => {
          recommendations.push({
            id: item.id,
            name: item.name,
            price: item.salePrice,
            quantity: item.quantity,
            source: 'INVENTORY_FALLBACK',
            category: item.category
          });
        });
      }

      return recommendations;
    } catch (err) {
      this.logger.error(`Failed to fetch recommendations for model: ${modelName}`, err);
      return [];
    }
  }
}
