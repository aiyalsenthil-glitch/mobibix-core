/**
 * Feature Flag System
 *
 * Enables/disables features dynamically without code deployments.
 * Supports tenant-level, shop-level, and global feature toggles.
 */
import { FeatureFlagScope } from '@prisma/client';

export { FeatureFlagScope };
/**
 * Enum of all available feature flags in the system
 * Add new features here as they're developed
 */
export enum FeatureFlag {
  // WhatsApp Features
  WHATSAPP_REMINDERS = 'whatsapp_reminders',
  WHATSAPP_AUTOMATIONS = 'whatsapp_automations',
  WHATSAPP_BROADCASTS = 'whatsapp_broadcasts',

  // Inventory Features
  SERIALIZED_INVENTORY = 'serialized_inventory',
  LOW_STOCK_ALERTS = 'low_stock_alerts',
  STOCK_TRANSFER = 'stock_transfer',

  // Billing Features
  GST_BILLING = 'gst_billing',
  LOYALTY_POINTS = 'loyalty_points',
  ADVANCED_PRICING = 'advanced_pricing',

  // CRM Features
  CUSTOMER_FOLLOW_UPS = 'customer_follow_ups',
  CUSTOMER_SEGMENTATION = 'customer_segmentation',

  // Job Card Features
  WARRANTY_JOBS = 'warranty_jobs',
  JOB_CARD_TEMPLATES = 'job_card_templates',

  // Analytics Features
  ADVANCED_REPORTS = 'advanced_reports',
  EXPORT_TO_EXCEL = 'export_to_excel',

  // Experimental Features
  AI_SUGGESTIONS = 'ai_suggestions',
  VOICE_COMMANDS = 'voice_commands',
}

/**

 * Feature flag configuration
 */
export interface FeatureFlagConfig {
  flag: FeatureFlag;
  enabled: boolean;
  scope: FeatureFlagScope;
  tenantId?: string; // Required if scope is TENANT or SHOP
  shopId?: string; // Required if scope is SHOP
  rolloutPercentage?: number; // 0-100, for gradual rollouts
  metadata?: Record<string, unknown>; // Additional config
}

/**
 * Default feature flags (global defaults)
 * Individual tenants can override these
 */
export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlag, boolean> = {
  // WhatsApp (enabled by default)
  [FeatureFlag.WHATSAPP_REMINDERS]: true,
  [FeatureFlag.WHATSAPP_AUTOMATIONS]: true,
  [FeatureFlag.WHATSAPP_BROADCASTS]: false, // Beta feature

  // Inventory (enabled)
  [FeatureFlag.SERIALIZED_INVENTORY]: true,
  [FeatureFlag.LOW_STOCK_ALERTS]: true,
  [FeatureFlag.STOCK_TRANSFER]: false, // Coming soon

  // Billing (enabled)
  [FeatureFlag.GST_BILLING]: true,
  [FeatureFlag.LOYALTY_POINTS]: true,
  [FeatureFlag.ADVANCED_PRICING]: false, // Premium feature

  // CRM (enabled)
  [FeatureFlag.CUSTOMER_FOLLOW_UPS]: true,
  [FeatureFlag.CUSTOMER_SEGMENTATION]: false, // Coming soon

  // Job Cards (enabled)
  [FeatureFlag.WARRANTY_JOBS]: true,
  [FeatureFlag.JOB_CARD_TEMPLATES]: false, // Coming soon

  // Analytics (enabled)
  [FeatureFlag.ADVANCED_REPORTS]: true,
  [FeatureFlag.EXPORT_TO_EXCEL]: true,

  // Experimental (disabled by default)
  [FeatureFlag.AI_SUGGESTIONS]: false,
  [FeatureFlag.VOICE_COMMANDS]: false,
};

/**
 * Feature flags that require premium subscription
 * These should be checked against tenant's plan
 */
export const PREMIUM_FEATURES: Set<FeatureFlag> = new Set([
  FeatureFlag.ADVANCED_PRICING,
  FeatureFlag.CUSTOMER_SEGMENTATION,
  FeatureFlag.AI_SUGGESTIONS,
  FeatureFlag.VOICE_COMMANDS,
]);

/**
 * Feature flags in beta (may have instability)
 */
export const BETA_FEATURES: Set<FeatureFlag> = new Set([
  FeatureFlag.WHATSAPP_BROADCASTS,
  FeatureFlag.STOCK_TRANSFER,
  FeatureFlag.JOB_CARD_TEMPLATES,
]);
