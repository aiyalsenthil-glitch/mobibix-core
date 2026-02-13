/**
 * Pagination Helper Utilities
 * Standardizes pagination across all endpoints
 */

/**
 * Parse pagination query parameters safely
 * Enforces bounds: skip >= 0, take between 1 and 100
 */
export function parsePaginationQuery(
  skipParam?: string | number,
  takeParam?: string | number,
): { skip: number; take: number } {
  let skip = 0;
  let take = 50; // Default page size

  if (skipParam != null) {
    const parsed =
      typeof skipParam === 'string' ? parseInt(skipParam, 10) : skipParam;
    skip = Math.max(0, parsed);
  }

  if (takeParam != null) {
    const parsed =
      typeof takeParam === 'string' ? parseInt(takeParam, 10) : takeParam;
    take = Math.max(1, Math.min(100, parsed)); // Clamp to 1-100
  }

  return { skip, take };
}

/**
 * Calculate pagination metadata from query and total count
 */
export function calculatePaginationMetadata(
  skip: number,
  take: number,
  total: number,
) {
  const page = Math.floor(skip / take) + 1;
  const totalPages = Math.ceil(total / take);

  return {
    total,
    page,
    limit: take,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
    offset: skip,
  };
}

/**
 * Build standardized paginated response
 */
export function buildPaginatedResponse<T>(
  data: T[],
  skip: number,
  take: number,
  total: number,
) {
  return {
    data,
    pagination: calculatePaginationMetadata(skip, take, total),
  };
}

/**
 * Pagination type for services
 */
export interface PaginationParams {
  skip?: number;
  take?: number;
}

/**
 * Generic paginated response type
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
    offset: number;
  };
}
