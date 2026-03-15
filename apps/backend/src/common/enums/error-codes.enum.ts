/**
 * Standardized Error Codes
 * Used for frontend error handling and logging
 * Format: <MODULE>_<ERROR_TYPE>
 */
export enum ErrorCode {
  // Auth Errors (1000-1099)
  AUTH_INVALID_CREDENTIALS = 'AUTH_001',
  AUTH_TOKEN_EXPIRED = 'AUTH_002',
  AUTH_TOKEN_INVALID = 'AUTH_003',
  AUTH_REFRESH_FAILED = 'AUTH_004',
  AUTH_UNAUTHORIZED = 'AUTH_005',
  AUTH_FORBIDDEN = 'AUTH_006',

  // Tenant Errors (1100-1199)
  TENANT_NOT_FOUND = 'TENANT_101',
  TENANT_INVALID = 'TENANT_102',
  TENANT_ACCESS_DENIED = 'TENANT_103',
  TENANT_LIMIT_EXCEEDED = 'TENANT_104',

  // User Errors (1200-1299)
  USER_NOT_FOUND = 'USER_201',
  USER_ALREADY_EXISTS = 'USER_202',
  USER_INVALID_ROLE = 'USER_203',
  USER_CANNOT_DELETE_SELF = 'USER_204',

  // Validation Errors (1300-1399)
  VALIDATION_FAILED = 'VAL_301',
  INVALID_EMAIL = 'VAL_302',
  INVALID_PHONE = 'VAL_303',
  INVALID_AMOUNT = 'VAL_304',
  MISSING_REQUIRED_FIELD = 'VAL_305',

  // Business Logic Errors (1400-1499)
  INSUFFICIENT_BALANCE = 'BIZ_401',
  PLAN_LIMIT_EXCEEDED = 'BIZ_402',
  OPERATION_NOT_ALLOWED = 'BIZ_403',
  INVALID_STATE_TRANSITION = 'BIZ_404',
  DUPLICATE_ENTRY = 'BIZ_405',

  // Database Errors (1500-1599)
  DATABASE_ERROR = 'DB_501',
  CONSTRAINT_VIOLATION = 'DB_502',
  RECORD_NOT_FOUND = 'DB_503',
  TRANSACTION_FAILED = 'DB_504',

  // External API Errors (1600-1699)
  FIREBASE_ERROR = 'EXT_601',
  PAYMENT_GATEWAY_ERROR = 'EXT_602',
  CRM_API_ERROR = 'EXT_603',
  WHATSAPP_API_ERROR = 'EXT_604',

  // System Errors (1700-1799)
  INTERNAL_SERVER_ERROR = 'SYS_701',
  SERVICE_UNAVAILABLE = 'SYS_702',
  TIMEOUT = 'SYS_703',
  CONFIGURATION_ERROR = 'SYS_704',
}

/**
 * User-friendly error messages
 * Frontend should use these for display
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Auth
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Invalid credentials provided',
  [ErrorCode.AUTH_TOKEN_EXPIRED]:
    'Your session has expired. Please log in again',
  [ErrorCode.AUTH_TOKEN_INVALID]: 'Invalid authentication token',
  [ErrorCode.AUTH_REFRESH_FAILED]:
    'Failed to refresh session. Please log in again',
  [ErrorCode.AUTH_UNAUTHORIZED]:
    'You are not authorized to access this resource',
  [ErrorCode.AUTH_FORBIDDEN]: 'Access forbidden',

  // Tenant
  [ErrorCode.TENANT_NOT_FOUND]: 'Tenant not found',
  [ErrorCode.TENANT_INVALID]: 'Invalid tenant',
  [ErrorCode.TENANT_ACCESS_DENIED]: 'You do not have access to this tenant',
  [ErrorCode.TENANT_LIMIT_EXCEEDED]: 'Tenant limit has been exceeded',

  // User
  [ErrorCode.USER_NOT_FOUND]: 'User not found',
  [ErrorCode.USER_ALREADY_EXISTS]: 'User already exists',
  [ErrorCode.USER_INVALID_ROLE]: 'Invalid user role',
  [ErrorCode.USER_CANNOT_DELETE_SELF]: 'Cannot delete your own account',

  // Validation
  [ErrorCode.VALIDATION_FAILED]: 'Validation failed',
  [ErrorCode.INVALID_EMAIL]: 'Please provide a valid email address',
  [ErrorCode.INVALID_PHONE]: 'Please provide a valid phone number',
  [ErrorCode.INVALID_AMOUNT]: 'Please provide a valid amount',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Missing required field',

  // Business Logic
  [ErrorCode.INSUFFICIENT_BALANCE]: 'Insufficient balance for this operation',
  [ErrorCode.PLAN_LIMIT_EXCEEDED]: 'You have exceeded your plan limit',
  [ErrorCode.OPERATION_NOT_ALLOWED]:
    'This operation is not allowed in the current state',
  [ErrorCode.INVALID_STATE_TRANSITION]: 'Invalid state transition',
  [ErrorCode.DUPLICATE_ENTRY]: 'This entry already exists',

  // Database
  [ErrorCode.DATABASE_ERROR]:
    'A database error occurred. Please try again later',
  [ErrorCode.CONSTRAINT_VIOLATION]: 'This action violates database constraints',
  [ErrorCode.RECORD_NOT_FOUND]: 'Record not found',
  [ErrorCode.TRANSACTION_FAILED]: 'Transaction failed. Please try again',

  // External API
  [ErrorCode.FIREBASE_ERROR]: 'Authentication service error. Please try again',
  [ErrorCode.PAYMENT_GATEWAY_ERROR]:
    'Payment processing error. Please try again',
  [ErrorCode.CRM_API_ERROR]: 'CRM service error. Please try again',
  [ErrorCode.WHATSAPP_API_ERROR]: 'WhatsApp service error. Please try again',

  // System
  [ErrorCode.INTERNAL_SERVER_ERROR]:
    'An internal server error occurred. Please try again later',
  [ErrorCode.SERVICE_UNAVAILABLE]:
    'Service is temporarily unavailable. Please try again later',
  [ErrorCode.TIMEOUT]: 'Request timeout. Please try again',
  [ErrorCode.CONFIGURATION_ERROR]:
    'Configuration error. Please contact support',
};
