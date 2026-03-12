import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateCompatibilityGroupDto, AddPhoneToGroupDto, LinkPartToGroupDto } from './dto/compatibility.dto';
import { PartType } from '@prisma/client';

@Injectable()
export class CompatibilityService {
  constructor(private prisma: PrismaService) {}

  async searchCompatibleParts(modelName: string) {
    // 1. Find the phone model
    const phoneModel = await this.prisma.phoneModel.findFirst({
      where: {
        modelName: {
          contains: modelName,
          mode: 'insensitive',
        },
      },
      include: {
        brand: true,
      },
    });

    if (!phoneModel) {
      throw new NotFoundException(`Phone model "${modelName}" not found`);
    }

    // 2. Find all compatibility groups this phone belongs to
    const groupLinks = await this.prisma.compatibilityGroupPhone.findMany({
      where: { phoneModelId: phoneModel.id },
      include: {
        group: {
          include: {
            parts: {
              include: {
                part: true,
              },
            },
            shopProducts: {
               where: { isActive: true }
            }
          },
        },
      },
    });

    // 3. Structure the response
    const compatibleParts: Record<string, any[]> = {};
    
    // Group parts by their type
    groupLinks.forEach(link => {
      const group = link.group;
      const typeKey = group.partType.toLowerCase();
      
      if (!compatibleParts[typeKey]) {
        compatibleParts[typeKey] = [];
      }

      // Add actual parts linked to the group
      group.parts.forEach(cp => {
        compatibleParts[typeKey].push({
          id: cp.part.id,
          name: cp.part.partName,
          source: 'PART_CATALOG'
        });
      });

      // Add Shop Products linked to the group (Integration requirement)
      group.shopProducts.forEach(product => {
        compatibleParts[typeKey].push({
          id: product.id,
          name: product.name,
          price: product.salePrice,
          quantity: product.quantity,
          source: 'INVENTORY'
        });
      });
      
      // Also find other phone models in the same group (for reference)
      // This helps with the "Compatible with: A50, A50S, M31" feature
    });

    return {
      model: `${phoneModel.brand.name} ${phoneModel.modelName}`,
      compatibleParts,
    };
  }

  async createGroup(dto: CreateCompatibilityGroupDto) {
    const existing = await this.prisma.compatibilityGroup.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Group with name "${dto.name}" already exists`);
    }

    return this.prisma.compatibilityGroup.create({
      data: {
        name: dto.name,
        partType: dto.partType,
      },
    });
  }

  async addPhoneToGroup(groupId: string, dto: AddPhoneToGroupDto) {
    const group = await this.prisma.compatibilityGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Compatibility group not found`);
    }

    const phone = await this.prisma.phoneModel.findUnique({
      where: { id: dto.phoneModelId },
    });

    if (!phone) {
      throw new NotFoundException(`Phone model not found`);
    }

    return this.prisma.compatibilityGroupPhone.upsert({
      where: {
        groupId_phoneModelId: {
          groupId,
          phoneModelId: dto.phoneModelId,
        },
      },
      update: {},
      create: {
        groupId,
        phoneModelId: dto.phoneModelId,
      },
    });
  }

  async linkPartToGroup(groupId: string, dto: LinkPartToGroupDto) {
    const group = await this.prisma.compatibilityGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Compatibility group not found`);
    }

    const part = await this.prisma.part.findUnique({
      where: { id: dto.partId },
    });

    if (!part) {
      throw new NotFoundException(`Part not found`);
    }

    return this.prisma.partCompatibility.upsert({
      where: {
        partId_groupId: {
          partId: dto.partId,
          groupId,
        },
      },
      update: {},
      create: {
        partId: dto.partId,
        groupId,
      },
    });
  }

  async suggestCompatibleModels(modelName: string) {
    const phoneModel = await this.prisma.phoneModel.findFirst({
      where: {
        modelName: {
          contains: modelName,
          mode: 'insensitive',
        },
      },
    });

    if (!phoneModel) {
      throw new NotFoundException(`Phone model "${modelName}" not found`);
    }

    // AI/Pattern Suggestion logic (Simplified for now)
    // Suggest models with similar display size and same brand
    return this.prisma.phoneModel.findMany({
      where: {
        brandId: phoneModel.brandId,
        displaySize: phoneModel.displaySize,
        id: { not: phoneModel.id },
      },
      take: 5,
    });
  }
}
