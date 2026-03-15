import { BadRequestException } from '@nestjs/common';
import { ProductType } from '@prisma/client';

/**
 * Stock Serialization Validation Rules
 *
 * Enforces business logic constraints for stock serialization (IMEI tracking)
 */

/**
 * Validate that a product type can support serialization
 * SERVICE products cannot be serialized (they're intangible)
 *
 * @throws BadRequestException if validation fails
 */
export function validateProductSerialization(
  productType: ProductType,
  isSerialized: boolean,
  productName?: string,
): void {
  if (isSerialized && productType === ProductType.SERVICE) {
    throw new BadRequestException(
      `Cannot enable serialization for SERVICE product${productName ? ` "${productName}"` : ''}. ` +
        `SERVICE products are intangible and cannot have IMEI/serial numbers.`,
    );
  }
}

/**
 * Validate IMEI format.
 * Standard IMEI is exactly 15 digits (3GPP TS 23.003).
 * IMEI-SV (with software version) is 16 digits.
 * We accept 15-16 digits only. MEID (14-digit) and custom 17-digit codes
 * are rejected to prevent silent inventory errors.
 *
 * @returns true if valid, false otherwise
 */
export function isValidIMEIFormat(imei: string): boolean {
  const trimmed = imei.trim();
  return /^\d{15,16}$/.test(trimmed);
}

/**
 * Validate array of IMEIs
 * Checks format and uniqueness within the array
 *
 * @throws BadRequestException if validation fails
 */
export function validateIMEIs(imeis: string[]): void {
  if (!imeis || imeis.length === 0) {
    throw new BadRequestException(
      'IMEI list cannot be empty for serialized products',
    );
  }

  // Validate formats
  const invalidIMEIs = imeis.filter((imei) => !isValidIMEIFormat(imei));
  if (invalidIMEIs.length > 0) {
    throw new BadRequestException(
      `Invalid IMEI format(s): ${invalidIMEIs.join(', ')}. ` +
        `IMEI must be 15 digits (16 for IMEI-SV). Received invalid entries.`,
    );
  }

  // Check for duplicates within request
  const trimmedIMEIs = imeis.map((i) => i.trim());
  const uniqueIMEIs = new Set(trimmedIMEIs);
  if (uniqueIMEIs.size !== trimmedIMEIs.length) {
    const duplicates = trimmedIMEIs.filter(
      (imei, index) => trimmedIMEIs.indexOf(imei) !== index,
    );
    throw new BadRequestException(
      `Duplicate IMEI(s) found in request: ${Array.from(new Set(duplicates)).join(', ')}`,
    );
  }
}

/**
 * Validate IMEI quantity matches stock quantity
 *
 * @throws BadRequestException if counts don't match
 */
export function validateIMEIQuantity(
  imeis: string[] | undefined,
  quantity: number,
  productName?: string,
): void {
  if (!imeis || imeis.length === 0) {
    throw new BadRequestException(
      `Serialized product${productName ? ` "${productName}"` : ''} requires ${quantity} IMEI(s). None provided.`,
    );
  }

  if (imeis.length !== quantity) {
    throw new BadRequestException(
      `IMEI count mismatch for${productName ? ` "${productName}"` : ''}. ` +
        `Expected: ${quantity}, Provided: ${imeis.length}`,
    );
  }
}
