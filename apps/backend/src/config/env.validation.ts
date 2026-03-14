/**
 * ════════════════════════════════════════════════════
 * Environment Variable Validation Module
 * ════════════════════════════════════════════════════
 *
 * RESPONSIBILITY: Validate all required environment variables at startup
 * FAIL FAST: If any critical variable is missing or invalid, crash immediately
 *
 * SECURITY FIX: Phase 1 - Production Blocker #2
 * - Prevents runtime failures when env vars are missing
 * - Enforces type safety for all env vars
 * - Documents all required configuration
 *
 * USAGE:
 * ```typescript
 * import { validateEnv } from './config/env.validation';
 *
 * // In main.ts bootstrap():
 * const env = validateEnv(); // Throws if invalid, exits process
 * ```
 */

import { z } from 'zod';

/**
 * Environment Variable Schema
 * Define all critical environment variables here
 */
const envSchema = z.object({
  // ═══════════════════════════════════════════════════
  // DATABASE
  // ═══════════════════════════════════════════════════
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid database connection URL')
    .min(1, 'DATABASE_URL is required'),

  // ═══════════════════════════════════════════════════
  // AUTHENTICATION & ENCRYPTION
  // ═══════════════════════════════════════════════════
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security')
    .describe('Secret key for signing JWT tokens'),

  JWT_EXPIRES_IN: z
    .string()
    .default('7d')
    .describe('JWT token expiration time (e.g., "7d", "24h")'),

  ENCRYPTION_MASTER_KEY: z
    .string()
    .min(32, 'ENCRYPTION_MASTER_KEY must be at least 32 characters')
    .describe('Master key for AES-256-GCM encryption (WhatsApp tokens, etc.)'),

  // ═══════════════════════════════════════════════════
  // FIREBASE (External Identity Provider)
  // ═══════════════════════════════════════════════════
  FIREBASE_SERVICE_ACCOUNT_BASE64: z
    .string()
    .min(1, 'FIREBASE_SERVICE_ACCOUNT_BASE64 is required')
    .describe('Base64-encoded Firebase service account JSON'),

  // ═══════════════════════════════════════════════════
  // WHATSAPP (Meta Cloud API)
  // ═══════════════════════════════════════════════════
  WHATSAPP_APP_SECRET: z
    .string()
    .min(1, 'WHATSAPP_APP_SECRET is required for webhook signature validation')
    .describe('Meta app secret for HMAC-SHA256 webhook signature validation'),

  WHATSAPP_VERIFY_TOKEN: z
    .string()
    .min(1, 'WHATSAPP_VERIFY_TOKEN is required for webhook verification')
    .describe('Token for Meta webhook verification handshake'),

  WHATSAPP_ACCESS_TOKEN: z
    .string()
    .optional()
    .describe('Default WhatsApp API access token (can be tenant-specific)'),

  WHATSAPP_API_VERSION: z
    .string()
    .default('v22.0')
    .describe('Meta Graph API version'),

  // ═══════════════════════════════════════════════════
  // PAYMENTS (Razorpay)
  // ═══════════════════════════════════════════════════
  RAZORPAY_KEY_ID: z
    .string()
    .min(1, 'RAZORPAY_KEY_ID is required')
    .describe('Razorpay API key ID'),

  RAZORPAY_KEY_SECRET: z
    .string()
    .min(1, 'RAZORPAY_KEY_SECRET is required')
    .describe('Razorpay API secret'),

  RAZORPAY_WEBHOOK_SECRET: z
    .string()
    .min(
      1,
      'RAZORPAY_WEBHOOK_SECRET is required for payment webhook validation',
    )
    .describe('Secret for Razorpay webhook signature verification'),

  // ═══════════════════════════════════════════════════
  // FRONTEND URLs (Redirection & Login)
  // ═══════════════════════════════════════════════════
  GYM_FRONTEND_URL: z
    .string()
    .url('GYM_FRONTEND_URL must be a valid URL')
    .default('http://localhost_REPLACED:3002')
    .describe('Production URL for GymPilot frontend'),

  ERP_FRONTEND_URL: z
    .string()
    .url('ERP_FRONTEND_URL must be a valid URL')
    .default('http://localhost_REPLACED:3001')
    .describe('Production URL for Mobibix frontend'),

  // ═══════════════════════════════════════════════════
  // EMAIL (Resend)
  // ═══════════════════════════════════════════════════
  RESEND_API_KEY: z
    .string()
    .min(1, 'RESEND_API_KEY is required for transactional emails')
    .describe('API key for Resend email service'),

  EMAIL_FROM_GYMPILOT: z
    .string()
    .default('GymPilot <notifications@mobibix.in>')
    .describe('Verified sender address for GymPilot emails'),

  EMAIL_FROM_MOBIBIX: z
    .string()
    .default('MobiBix <notifications@REMOVED_DOMAIN>')
    .describe('Verified sender address for Mobibix emails'),

  // ═══════════════════════════════════════════════════
  // APP VERSIONING (Gym App)
  // ═══════════════════════════════════════════════════
  ANDROID_LATEST_VERSION_CODE: z
    .string()
    .default('100')
    .describe('Latest available version code for Android app'),

  ANDROID_MIN_REQUIRED_VERSION_CODE: z
    .string()
    .default('1')
    .describe('Minimum version code required to force update'),

  // ═══════════════════════════════════════════════════
  // OBSERVABILITY
  // ═══════════════════════════════════════════════════
  SENTRY_DSN: z
    .string()
    .url('SENTRY_DSN must be a valid DSN')
    .optional()
    .describe('Sentry DSN for error tracking'),

  // ═══════════════════════════════════════════════════
  // OPTIONAL / ENVIRONMENT-SPECIFIC
  // ═══════════════════════════════════════════════════
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Application environment'),

  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .describe('HTTP server port'),

  // CORS Configuration
  CORS_ORIGIN: z
    .string()
    .optional()
    .describe('Allowed CORS origins (comma-separated)'),

  // Redis (if used for caching)
  REDIS_URL: z.string().optional().describe('Unified Redis connection URL'),
  REDIS_HOST: z.string().optional().describe('Redis host'),
  REDIS_PORT: z.string().optional().describe('Redis port'),
  REDIS_PASSWORD: z.string().optional().describe('Redis password'),
});

/**
 * Inferred TypeScript type from Zod schema
 * Use this for type-safe access to env vars
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validated environment configuration (singleton)
 */
let validatedEnv: EnvConfig | null = null;

/**
 * Validate environment variables at startup
 * Throws ZodError with detailed validation errors if invalid
 * Exits process with code 1 on validation failure
 *
 * @returns Validated environment configuration
 */
export function validateEnv(): EnvConfig {
  // Return cached result if already validated
  if (validatedEnv) {
    return validatedEnv;
  }

  console.log('🔍 Validating environment variables...');

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ ENVIRONMENT VALIDATION FAILED:');
    console.error('════════════════════════════════════════════════════');

    // Pretty-print validation errors
    const errors = result.error.format();
    Object.entries(errors).forEach(([key, error]) => {
      if (key !== '_errors' && error && typeof error === 'object') {
        const errorObj = error as { _errors?: string[] };
        if (errorObj._errors && errorObj._errors.length > 0) {
          console.error(`  ❌ ${key}:`);
          errorObj._errors.forEach((msg: string) => {
            console.error(`     - ${msg}`);
          });
        }
      }
    });

    console.error('════════════════════════════════════════════════════');
    console.error('💡 Fix: Add missing variables to .env file');
    console.error('💡 Docs: See .env.example for all required variables');
    console.error('════════════════════════════════════════════════════');

    // Exit process - cannot run with invalid configuration
    process.exit(1);
  }

  validatedEnv = result.data;
  console.log('✅ Environment validation passed');

  // Log non-sensitive config for debugging
  if (validatedEnv.NODE_ENV !== 'production') {
    console.log('📋 Configuration:');
    console.log(`   - Environment: ${validatedEnv.NODE_ENV}`);
    console.log(`   - Port: ${validatedEnv.PORT}`);
    console.log(
      `   - Database: ${validatedEnv.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`,
    ); // Mask password
    console.log(`   - WhatsApp API: ${validatedEnv.WHATSAPP_API_VERSION}`);
    console.log(`   - JWT Expiration: ${validatedEnv.JWT_EXPIRES_IN}`);
  }

  return validatedEnv;
}

/**
 * Get validated environment configuration
 * Must call validateEnv() first (usually in main.ts)
 *
 * @returns Validated environment configuration
 * @throws Error if validateEnv() has not been called yet
 */
export function getEnv(): EnvConfig {
  if (!validatedEnv) {
    throw new Error(
      'Environment not validated! Call validateEnv() in main.ts before accessing env config.',
    );
  }
  return validatedEnv;
}

/**
 * Type-safe environment variable access
 * Use this instead of process.env.* for type safety
 *
 * Example:
 * ```typescript
 * import { getEnv } from './config/env.validation';
 *
 * const env = getEnv();
 * const secret = env.JWT_SECRET; // Type-safe!
 * ```
 */
