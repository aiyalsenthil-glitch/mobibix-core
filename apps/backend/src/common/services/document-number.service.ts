import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  PrismaClient,
  DocumentType,
  YearFormat,
  ResetPolicy,
} from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { getFinancialYear } from '../utils/invoice-number.util';

/**
 * Generic document numbering service with database-backed configuration.
 * Replaces hardcoded document number generators with a flexible, per-shop system.
 *
 * Features:
 * - Transaction-based with row-level locking (FOR UPDATE)
 * - Auto-reset on financial year/month change based on resetPolicy
 * - Atomic sequence increment
 * - Fully customizable format per shop and document type
 *
 * Example usage:
 * ```ts
 * const number = await this.docNumberService.generateDocumentNumber(
 *   shopId,
 *   DocumentType.SALES_INVOICE,
 *   new Date(),
 *   tx // Pass transaction client
 * );
 * // Result: "HP-S-2526-0001"
 * ```
 */
@Injectable()
export class DocumentNumberService {
  private readonly logger = new Logger(DocumentNumberService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate next document number for a shop and document type.
   *
   * CRITICAL: This method uses row-level locking to prevent race conditions
   * in concurrent document generation. Always call within a transaction.
   *
   * @param shopId - Shop identifier
   * @param documentType - Type of document (SALES_INVOICE, JOB_CARD, etc.)
   * @param date - Document date (used for financial year calculation)
   * @param prismaClient - Optional transaction client (creates new transaction if not provided)
   * @returns Formatted document number (e.g., "HP-S-2526-0001")
   */
  async generateDocumentNumber(
    shopId: string,
    documentType: DocumentType,
    date: Date,
    prismaClient?: Omit<
      PrismaClient,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >,
  ): Promise<string> {
    // If no transaction provided, create one using injected PrismaService
    if (!prismaClient) {
      return await this.prisma.$transaction(async (tx) => {
        return this.generateDocumentNumberInternal(
          shopId,
          documentType,
          date,
          tx,
        );
      });
    }

    // Use provided transaction
    return this.generateDocumentNumberInternal(
      shopId,
      documentType,
      date,
      prismaClient,
    );
  }

  /**
   * Internal implementation with transaction support.
   * MUST be called within a transaction context.
   */
  private async generateDocumentNumberInternal(
    shopId: string,
    documentType: DocumentType,
    date: Date,
    tx: Omit<
      PrismaClient,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >,
  ): Promise<string> {
    try {
      // 1. Fetch setting with row-level lock (FOR UPDATE)
      // This prevents concurrent transactions from reading the same currentNumber
      const setting = await tx.$queryRaw<
        {
          id: string;
          prefix: string;
          separator: string;
          documentCode: string;
          yearFormat: YearFormat;
          numberLength: number;
          resetPolicy: ResetPolicy;
          currentNumber: number;
          currentYear: string | null;
        }[]
      >`
        SELECT id, prefix, separator, "documentCode", "yearFormat", "numberLength", "resetPolicy", "currentNumber", "currentYear"
        FROM "ShopDocumentSetting"
        WHERE "shopId" = ${shopId}
          AND "documentType" = ${documentType}::"DocumentType"
          AND "isActive" = true
        FOR UPDATE
      `;

      if (!setting || setting.length === 0) {
        throw new NotFoundException(
          `Document setting not found for shopId=${shopId}, documentType=${documentType}. ` +
            `Please configure document numbering in shop settings.`,
        );
      }

      const config = setting[0];

      // 2. Calculate year string based on yearFormat
      const yearString = this.formatYear(date, config.yearFormat);

      // 3. Determine if sequence should reset
      let nextNumber = config.currentNumber + 1;
      let shouldReset = false;

      if (config.resetPolicy === 'YEARLY') {
        const currentYearKey = this.getYearResetKey(date, 'YEARLY');
        if (config.currentYear !== currentYearKey) {
          shouldReset = true;
          nextNumber = 1;
        }
      } else if (config.resetPolicy === 'MONTHLY') {
        const currentMonthKey = this.getYearResetKey(date, 'MONTHLY');
        if (config.currentYear !== currentMonthKey) {
          shouldReset = true;
          nextNumber = 1;
        }
      }
      // NEVER policy: just increment, never reset

      // 4. Update setting atomically
      const newYearKey = shouldReset
        ? this.getYearResetKey(date, config.resetPolicy)
        : config.currentYear;

      // Use type assertion for transaction client
      await (tx as any).shopDocumentSetting.update({
        where: { id: config.id },
        data: {
          currentNumber: nextNumber,
          currentYear: newYearKey,
          updatedAt: new Date(),
        },
      });

      // 5. Assemble formatted number
      const paddedNumber = nextNumber
        .toString()
        .padStart(config.numberLength, '0');
      const parts: string[] = [config.prefix, config.documentCode];

      if (yearString) {
        parts.push(yearString);
      }

      parts.push(paddedNumber);

      const documentNumber = parts.join(config.separator);

      this.logger.log(
        `Generated ${documentType}: ${documentNumber} (shopId=${shopId}, reset=${shouldReset})`,
      );

      return documentNumber;
    } catch (error) {
      this.logger.error(
        `Failed to generate document number for shopId=${shopId}, documentType=${documentType}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Format year based on YearFormat enum
   */
  private formatYear(date: Date, format: YearFormat): string {
    switch (format) {
      case 'FY':
        // Financial year: 2526 (April 2025 - March 2026)
        return getFinancialYear(date);

      case 'YYYY': {
        // Full 4-digit years: 20252026
        const fy = getFinancialYear(date); // "2526"
        return `20${fy.slice(0, 2)}20${fy.slice(2)}`;
      }

      case 'YY': {
        // Ending year only: 26
        const endYear = getFinancialYear(date).slice(2); // "26"
        return endYear;
      }

      case 'NONE':
        // No year
        return '';

      default:
        return '';
    }
  }

  /**
   * Get unique key for reset comparison
   */
  private getYearResetKey(date: Date, resetPolicy: ResetPolicy): string {
    if (resetPolicy === 'YEARLY') {
      // Use financial year as key
      return getFinancialYear(date); // "2526"
    } else if (resetPolicy === 'MONTHLY') {
      // Use YYYY-MM as key
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${year}-${month}`;
    }
    // NEVER policy doesn't need reset key
    return '';
  }

  /**
   * Initialize default settings for a new shop.
   * Call this when creating a new shop to set up document numbering.
   *
   * @param shopId - Shop identifier
   * @param shopPrefix - Shop prefix (e.g., "HP" from Himachal Pradesh)
   * @param prismaClient - Optional transaction client (uses injected PrismaService if not provided)
   */
  async initializeShopDocumentSettings(
    shopId: string,
    shopPrefix: string,
    prismaClient?: Omit<
      PrismaClient,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >,
  ): Promise<void> {
    try {
      // Use provided transaction or injected PrismaService
      const client = (prismaClient || this.prisma) as any;

      const defaultSettings = [
        {
          shopId,
          documentType: DocumentType.SALES_INVOICE,
          prefix: shopPrefix,
          separator: '-',
          documentCode: 'S',
          yearFormat: YearFormat.FY,
          numberLength: 4,
          resetPolicy: ResetPolicy.YEARLY,
        },
        {
          shopId,
          documentType: DocumentType.PURCHASE_INVOICE,
          prefix: shopPrefix,
          separator: '-',
          documentCode: 'P',
          yearFormat: YearFormat.FY,
          numberLength: 4,
          resetPolicy: ResetPolicy.YEARLY,
        },
        {
          shopId,
          documentType: DocumentType.JOB_CARD,
          prefix: shopPrefix,
          separator: '-',
          documentCode: 'J',
          yearFormat: YearFormat.FY,
          numberLength: 4,
          resetPolicy: ResetPolicy.YEARLY,
        },
        {
          shopId,
          documentType: DocumentType.RECEIPT,
          prefix: shopPrefix,
          separator: '-',
          documentCode: 'R',
          yearFormat: YearFormat.FY,
          numberLength: 4,
          resetPolicy: ResetPolicy.YEARLY,
        },
        {
          shopId,
          documentType: DocumentType.QUOTATION,
          prefix: shopPrefix,
          separator: '-',
          documentCode: 'Q',
          yearFormat: YearFormat.FY,
          numberLength: 4,
          resetPolicy: ResetPolicy.YEARLY,
        },
        {
          shopId,
          documentType: DocumentType.PURCHASE_ORDER,
          prefix: shopPrefix,
          separator: '-',
          documentCode: 'PO',
          yearFormat: YearFormat.FY,
          numberLength: 4,
          resetPolicy: ResetPolicy.YEARLY,
        },
      ];

      // Use createMany to insert all settings at once
      await client.shopDocumentSetting.createMany({
        data: defaultSettings,
        skipDuplicates: true, // Prevents error if settings already exist
      });

      this.logger.log(`Initialized document settings for shop ${shopId}`);
    } catch (error) {
      this.logger.error(
        `Failed to initialize document settings for shop ${shopId}`,
        error,
      );
      throw error;
    }
  }
}
