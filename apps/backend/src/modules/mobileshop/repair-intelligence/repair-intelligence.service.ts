import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class RepairIntelligenceService {
  constructor(private prisma: PrismaService) {}

  /**
   * 🔍 Feature 2: Auto Fault Detection From Complaint
   * Uses simple keyword mapping to suggest a FaultType.
   */
  async suggestFaultType(tenantId: string, complaint: string) {
    if (!complaint) return null;

    const lowerComplaint = complaint.toLowerCase();

    // Mapping: Keyword -> FaultType Name
    const mapping: Record<string, string> = {
      'charging': 'Not Charging',
      'charge': 'Not Charging',
      'port': 'Not Charging',
      'screen': 'No Display',
      'display': 'No Display',
      'black': 'No Display',
      'touch': 'No Display',
      'bootloop': 'Boot Loop',
      'restart': 'Boot Loop',
      'logo': 'Boot Loop',
      'network': 'No Network',
      'signal': 'No Network',
      'sim': 'No Network',
      'wifi': 'No Network',
      'battery': 'Battery Issue',
      'drain': 'Battery Issue',
      'backup': 'Battery Issue',
      'mic': 'Audio Issue',
      'speaker': 'Audio Issue',
      'sound': 'Audio Issue',
      'water': 'Liquid Damage',
      'liquid': 'Liquid Damage',
    };

    let matchedFaultName: string | null = null;
    for (const [keyword, faultName] of Object.entries(mapping)) {
      if (lowerComplaint.includes(keyword)) {
        matchedFaultName = faultName;
        break;
      }
    }

    if (!matchedFaultName) return null;

    // Find the actual FaultType ID from the database
    const faultType = await this.prisma.faultType.findFirst({
      where: { name: matchedFaultName },
    });

    return faultType ? { id: faultType.id, name: faultType.name } : null;
  }

  /**
   * 🛠️ Feature 3: Smart Parts Suggestion
   * Suggests common parts based on selected faultType.
   */
  async suggestParts(tenantId: string, shopId: string, faultTypeId: string) {
    // 1. Get FaultType
    const faultType = await this.prisma.faultType.findUnique({
      where: { id: faultTypeId },
    });

    if (!faultType) return [];

    // 2. Logic: Query RepairKnowledge or use static mapping if knowledge base is empty
    // RepairKnowledge model exists but might be empty.
    const repairNotes = await this.prisma.repairKnowledge.findMany({
      where: { faultTypeId, status: 'APPROVED' },
      select: { content: true },
    });

    // For Phase 1, we combine static mapping with approved repair tips
    const staticPartsMapping: Record<string, string[]> = {
      'Not Charging': ['Charging Port Flex', 'Battery Connector', 'Charging IC'],
      'No Display': ['LCD Screen Assembly', 'Display Connector Flex', 'Backlight IC'],
      'Boot Loop': ['Battery', 'Power Button Flex', 'Flash Memory'],
      'No Network': ['Antenna Flex', 'Network IC', 'SIM Tray'],
      'Battery Issue': ['Replacement Battery', 'Charging IC'],
      'Audio Issue': ['Speaker', 'Microphone', 'Audio IC'],
      'Liquid Damage': ['Isopropyl Alcohol (Service)', 'Ultrasonic Cleaning (Service)'],
    };

    const suggestedPartNames = staticPartsMapping[faultType.name] || [];

    const partsInStock = await Promise.all(
      suggestedPartNames.map(async (name) => {
        const product = await this.prisma.shopProduct.findFirst({
          where: {
            tenantId,
            shopId,
            name: { contains: name, mode: 'insensitive' },
            isActive: true,
          },
          select: { id: true, name: true, quantity: true },
        });

        return {
          id: product?.id || `suggested-${name}`,
          name: product?.name || name,
          quantity: product ? product.quantity : 0,
        };
      }),
    );

    return partsInStock;
  }
}
