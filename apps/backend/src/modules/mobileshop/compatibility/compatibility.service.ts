import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { 
  CreateCompatibilityGroupDto, 
  AddPhoneToGroupDto, 
  LinkPartToGroupDto,
  CreateFeedbackDto,
  UnlinkModelDto
} from './dto/compatibility.dto';
import { PartType, FeedbackStatus } from '@prisma/client';

@Injectable()
export class CompatibilityService {
  constructor(private prisma: PrismaService) {}

  async searchCompatibleParts(modelName: string) {
    const terms = modelName.trim().split(' ').filter(t => t.length > 0);
    const firstTerm = terms[0];
    const otherTerms = terms.slice(1).join(' ');

    // 1. Find the phone model
    let phoneModel = await this.prisma.phoneModel.findFirst({
      where: {
        AND: [
          { brand: { name: { contains: firstTerm, mode: 'insensitive' } } },
          { modelName: { contains: otherTerms, mode: 'insensitive' } }
        ]
      },
      include: { brand: true },
    });

    // Fallback to simpler search if no brand/model match
    if (!phoneModel) {
      phoneModel = await this.prisma.phoneModel.findFirst({
        where: { modelName: { contains: modelName, mode: 'insensitive' } },
        include: { brand: true },
      });
    }

    if (!phoneModel) {
      console.log(`[CompatibilityService] No model found for: ${modelName}`);
      throw new NotFoundException(`Phone model "${modelName}" not found`);
    }

    console.log(`[CompatibilityService] Found model: ${phoneModel.brand.name} ${phoneModel.modelName} (ID: ${phoneModel.id})`);


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
            },
            phones: {
              include: {
                phoneModel: {
                  include: { brand: true }
                }
              }
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
      const typeKey = group.partType;
      
      if (!compatibleParts[typeKey]) {
        compatibleParts[typeKey] = [];
      }

      const otherModels = group.phones
        .filter(p => p.phoneModelId !== phoneModel.id && p.phoneModel) // Safety check
        .map(p => `${p.phoneModel.brand?.name || ''} ${p.phoneModel.modelName}`.trim());

      // If no catalog parts and no inventory products exist yet,
      // create a "Virtual" entry to show the technician that this item is common
      if (group.parts.length === 0 && group.shopProducts.length === 0) {
        // Clean up group name (e.g., "TEMPERED_GLASS_123" -> "Universal Tempered Glass")
        const cleanName = group.name
          .replace(/_\d+$/, '')
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');

        compatibleParts[typeKey].push({
          id: `virtual-${group.id}`,
          name: `Universal ${cleanName}`,
          source: 'DATABASE',
          otherModels
        });
      }

      group.parts.forEach(cp => {
        compatibleParts[typeKey].push({
          id: cp.part.id,
          name: cp.part.partName,
          source: 'PART_CATALOG',
          otherModels
        });
      });

      // Add Shop Products linked to the group
      group.shopProducts.forEach(product => {
        compatibleParts[typeKey].push({
          id: product.id,
          name: product.name,
          price: product.salePrice,
          quantity: product.quantity,
          source: 'INVENTORY',
          otherModels
        });
      });
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

  async autocompletePhoneModels(query: string) {
    if (!query || query.length < 2) return [];

    const terms = query.split(' ').filter(t => t.length > 0);
    const firstTerm = terms[0];
    const otherTerms = terms.slice(1).join(' ');

    const models = await this.prisma.phoneModel.findMany({
      where: {
        OR: [
          // Case 1: Multiple terms (e.g. "Samsung A20")
          terms.length > 1 ? {
            AND: [
              { brand: { name: { contains: firstTerm, mode: 'insensitive' } } },
              { modelName: { contains: otherTerms, mode: 'insensitive' } }
            ]
          } : {},
          // Case 2: Model name contains the query
          { modelName: { contains: query, mode: 'insensitive' } },
          // Case 3: Brand name contains the query
          { brand: { name: { contains: query, mode: 'insensitive' } } }
        ]
      },
      include: {
        brand: true
      },
      take: 6,
      orderBy: {
        modelName: 'asc'
      }
    });

    return models.map(m => ({
      id: m.id,
      modelName: m.modelName,
      brandName: m.brand.name,
      fullName: `${m.brand.name} ${m.modelName}`
    }));
  }

  // --- ADMIN METHODS ---

  async createPhoneModel(dto: { brandName: string; modelName: string }) {
    const brand = await this.prisma.brand.upsert({
      where: { name: dto.brandName },
      update: {},
      create: { name: dto.brandName },
    });

    const existing = await this.prisma.phoneModel.findUnique({
      where: {
        brandId_modelName: {
          brandId: brand.id,
          modelName: dto.modelName,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Model "${dto.modelName}" already exists for brand "${dto.brandName}"`);
    }

    return this.prisma.phoneModel.create({
      data: {
        brandId: brand.id,
        modelName: dto.modelName,
      },
    });
  }

  async smartLinkModels(dto: { modelAId: string; modelBId: string; categories: PartType[] }) {
    const { modelAId, modelBId, categories } = dto;
    const results: { category: PartType; status: string }[] = [];

    for (const category of categories) {
      // 1. Get current IDs of groups for both models in this category
      const groupA = await this.prisma.compatibilityGroupPhone.findFirst({
        where: { phoneModelId: modelAId, group: { partType: category } },
        include: { group: true }
      });

      const groupB = await this.prisma.compatibilityGroupPhone.findFirst({
        where: { phoneModelId: modelBId, group: { partType: category } },
        include: { group: true }
      });

      const groupIdA = groupA?.groupId;
      const groupIdB = groupB?.groupId;

      if (groupIdA && groupIdB) {
        if (groupIdA === groupIdB) {
          results.push({ category, status: 'ALREADY_LINKED' });
          continue;
        }

        // Merge group B into group A
        await this.prisma.$transaction([
          // Move all phones from B to A
          this.prisma.compatibilityGroupPhone.updateMany({
            where: { groupId: groupIdB },
            data: { groupId: groupIdA }
          }),
          // Move all parts links from B to A (handle duplicates)
          // We do this by deleting and moving
          // Simplified: delete group B and let relations cascade or handle manually
          this.prisma.partCompatibility.deleteMany({
            where: { groupId: groupIdA } // Remove current links to avoid unique constraint on merge
          }),
          this.prisma.partCompatibility.updateMany({
            where: { groupId: groupIdB },
            data: { groupId: groupIdA }
          }),
          // Delete Group B
          this.prisma.compatibilityGroup.delete({ where: { id: groupIdB } })
        ]);
        results.push({ category, status: 'MERGED' });
      } else if (groupIdA) {
        // Add B to A
        await this.prisma.compatibilityGroupPhone.create({
          data: { groupId: groupIdA, phoneModelId: modelBId }
        });
        results.push({ category, status: 'ADDED_TO_A' });
      } else if (groupIdB) {
        // Add A to B
        await this.prisma.compatibilityGroupPhone.create({
          data: { groupId: groupIdB, phoneModelId: modelAId }
        });
        results.push({ category, status: 'ADDED_TO_B' });
      } else {
        // Create new group for both
        const newGroup = await this.prisma.compatibilityGroup.create({
          data: {
            name: `${category}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            partType: category
          }
        });
        await this.prisma.compatibilityGroupPhone.createMany({
          data: [
            { groupId: newGroup.id, phoneModelId: modelAId },
            { groupId: newGroup.id, phoneModelId: modelBId }
          ]
        });
        results.push({ category, status: 'CREATED_NEW' });
      }
    }

    return results;
  }

  async getAdminStats() {
    const [models, brands, groups, junctions] = await Promise.all([
      this.prisma.phoneModel.count(),
      this.prisma.brand.count(),
      this.prisma.compatibilityGroup.count(),
      this.prisma.compatibilityGroupPhone.count(),
    ]);

    return { models, brands, groups, junctions };
  }
  async unlinkModel(dto: UnlinkModelDto) {
    const { phoneModelId, partType } = dto;

    // Find the junction for this model and category
    const junction = await this.prisma.compatibilityGroupPhone.findFirst({
      where: {
        phoneModelId,
        group: { partType },
      },
    });

    if (!junction) return { success: false, message: 'Association not found' };

    await this.prisma.compatibilityGroupPhone.delete({
      where: { id: junction.id },
    });

    return { success: true };
  }

  async submitFeedback(dto: CreateFeedbackDto) {
    return this.prisma.compatibilityFeedback.create({
      data: {
        type: dto.type,
        phoneModelId: dto.phoneModelId,
        targetModelId: dto.targetModelId,
        partType: dto.partType,
        details: dto.details,
      },
    });
  }

  async getPendingFeedback() {
    return this.prisma.compatibilityFeedback.findMany({
      where: { status: 'PENDING' },
      include: {
        phoneModel: { include: { brand: true } },
        targetModel: { include: { brand: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async processFeedback(id: string, status: FeedbackStatus) {
    return this.prisma.compatibilityFeedback.update({
      where: { id },
      data: { status },
    });
  }
}
