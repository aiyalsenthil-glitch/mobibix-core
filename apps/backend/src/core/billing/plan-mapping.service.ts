import { Injectable } from '@nestjs/common';
import { ModuleType } from '@prisma/client';

/**
 * ════════════════════════════════════════════════════
 * PLAN MAPPING SERVICE
 * ════════════════════════════════════════════════════
 *
 * Purpose: Translate between public plan names and internal codes.
 *
 * Public Plans (UI):
 *   - TRIAL
 *   - STANDARD
 *   - PRO
 *
 * Internal Codes (DB):
 *   - GYM_TRIAL, GYM_STANDARD, GYM_PRO
 *   - MOBIBIX_TRIAL, MOBIBIX_STANDARD, MOBIBIX_PRO
 *   - WHATSAPP_CRM (add-on)
 */

export interface PublicPlan {
  name: string; // Changed from literal to string for flexibility
  displayName: string;
  level: number;
  isAddon: boolean; // Changed to boolean
  maxShops?: number | null;
}

export interface PublicAddon {
  name: 'WHATSAPP_CRM';
  displayName: string;
  isAddon: true;
}

@Injectable()
export class PlanMappingService {
  /**
   * Map public plan name to internal plan code
   */
  resolveInternalPlanCode(
    publicName: string,
    module: ModuleType,
  ): string | null {
    const mapping: Record<string, Record<string, string>> = {
      CORE: {},
      GYM: {
        TRIAL: 'GYM_TRIAL',
        STANDARD: 'GYM_STANDARD',
        PRO: 'GYM_PRO',
      },
      MOBILE_SHOP: {
        TRIAL: 'MOBIBIX_TRIAL',
        STANDARD: 'MOBIBIX_STANDARD',
        PRO: 'MOBIBIX_PRO',
      },
      MOBILE_REPAIR: {
        // Same as MOBILE_SHOP
        TRIAL: 'MOBIBIX_TRIAL',
        STANDARD: 'MOBIBIX_STANDARD',
        PRO: 'MOBIBIX_PRO',
      },
      WHATSAPP_CRM: {
        STARTER: 'WHATSAPP_STARTER',
        GROWTH: 'WHATSAPP_GROWTH',
        ADVANCED: 'WHATSAPP_ADVANCED',
      },
      DIGITAL_LEDGER: {},
    };

    return mapping[module]?.[publicName] || null;
  }

  /**
   * Map internal plan code to public plan name
   */
  getPublicPlanName(internalCode: string): string {
    const reverseMapping: Record<string, string> = {
      GYM_TRIAL: 'TRIAL',
      GYM_STANDARD: 'STANDARD',
      GYM_PRO: 'PRO',
      MOBIBIX_TRIAL: 'TRIAL',
      MOBIBIX_STANDARD: 'STANDARD',
      MOBIBIX_PRO: 'PRO',
      WHATSAPP_STARTER: 'STARTER',
      WHATSAPP_GROWTH: 'GROWTH',
      WHATSAPP_ADVANCED: 'ADVANCED',
    };

    return reverseMapping[internalCode] || internalCode;
  }

  /**
   * Get simplified public plans for a module
   */
  getPublicPlans(module: ModuleType): PublicPlan[] {
    if (module === ModuleType.WHATSAPP_CRM) {
      return [
        {
          name: 'STARTER',
          displayName: 'Starter',
          level: 10,
          isAddon: true,
        },
        {
          name: 'GROWTH',
          displayName: 'Growth',
          level: 11,
          isAddon: true,
        },
        {
          name: 'ADVANCED',
          displayName: 'Advanced',
          level: 12,
          isAddon: true,
        },
      ];
    }

    // MOBILE_REPAIR uses same plans as MOBILE_SHOP
    return [
      {
        name: 'TRIAL',
        displayName: 'Trial',
        level: 0,
        isAddon: false,
        maxShops: 1,
      },
      {
        name: 'STANDARD',
        displayName: 'Standard',
        level: 1,
        isAddon: false,
        maxShops: 1,
      },
      {
        name: 'PRO',
        displayName: 'Pro',
        level: 2,
        isAddon: false,
        maxShops: null,
      },
    ];
  }

  /**
   * Get available add-ons
   */
  getPublicAddons(): PublicAddon[] {
    return [
      {
        name: 'WHATSAPP_CRM',
        displayName: 'WhatsApp CRM',
        isAddon: true,
      },
    ];
  }
}
