import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { YearFormat, ResetPolicy } from '@prisma/client';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { UpdateShopSettingsDto } from './dto/update-shop-settings.dto';
import {
  UpdateDocumentSettingDto,
  DocumentType,
} from './dto/update-document-setting.dto';
import { isValidIndianGSTIN } from '../../common/validators/gstin.validator';
import { getFinancialYear } from '../../common/utils/invoice-number.util';
import { DocumentNumberService } from '../../common/services/document-number.service';
import { PLAN_CAPABILITIES } from '../billing/plan-capabilities';

@Injectable()
export class ShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly docNumberService: DocumentNumberService,
  ) {}

  async listShops(
    tenantId: string,
    options?: { skip?: number; take?: number },
  ) {
    // Parallel queries for better performance
    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where: { tenantId, isActive: true },
        skip: options?.skip ?? 0,
        take: options?.take ?? 50,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          addressLine1: true,
          phone: true,
          gstNumber: true,
          gstEnabled: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.shop.count({ where: { tenantId, isActive: true } }),
    ]);

    return {
      data: shops,
      total,
      skip: options?.skip ?? 0,
      take: options?.take ?? 50,
    };
  }

  async createShop(tenantId: string, role: string, dto: CreateShopDto) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only owner can create shops');
    }

    // If GST number provided, validate and auto-enable GST
    const gstNumber = dto.gstNumber?.trim();
    if (gstNumber && !isValidIndianGSTIN(gstNumber)) {
      throw new ForbiddenException('Invalid GSTIN format');
    }

    // ───────────────────────────────────────────────
    // 🛡️ MULTI-SHOP GUARD
    // ───────────────────────────────────────────────
    const shopCount = await this.prisma.shop.count({ where: { tenantId } });
    if (shopCount >= 1) {
      // Check if plan allows multi-shop
      const subscription = await this.prisma.tenantSubscription.findFirst({
        where: { tenantId, status: 'ACTIVE' },
        include: { plan: true },
        orderBy: { startDate: 'desc' },
      });

      // Default to TRIAL capabilities if no active sub, but safer to be restrictive if we can't determine
      // Actually, if no sub, they might be in implicit trial or expired.
      // Let's assume 'MOBIBIX_TRIAL' if nothing found for now, or fetch from tenant type.
      const planCode = subscription?.plan?.code ?? 'MOBIBIX_TRIAL';

      const capabilities =
        PLAN_CAPABILITIES[planCode as keyof typeof PLAN_CAPABILITIES];

      const canUseMultiShop =
        'canUseMultiShop' in capabilities
          ? capabilities.canUseMultiShop
          : false;

      if (!canUseMultiShop) {
        throw new ForbiddenException(
          'Your current plan does not support multiple shops. Please upgrade to Pro.',
        );
      }
    }

    const shop = await this.prisma.shop.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone,
        addressLine1: dto.addressLine1,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        invoicePrefix: dto.invoicePrefix,
        gstNumber,
        gstEnabled: !!gstNumber,
        website: dto.website,
        logoUrl: dto.logoUrl,
        invoiceFooter: dto.invoiceFooter,
      },
    });

    // Initialize document numbering settings for the new shop
    await this.docNumberService.initializeShopDocumentSettings(
      shop.id,
      shop.invoicePrefix || 'HP', // Default prefix if none provided
    );

    return shop;
  }
  async getShopById(tenantId: string, shopId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
    });

    if (!shop) {
      throw new ForbiddenException('Shop not found');
    }

    return shop;
  }
  async updateShop(
    tenantId: string,
    role: string,
    shopId: string,
    dto: UpdateShopDto,
  ) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only owner can update shop');
    }

    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
    });

    if (!shop) {
      throw new ForbiddenException('Shop not found');
    }

    const gstNumber = dto.gstNumber?.trim();
    if (gstNumber && !isValidIndianGSTIN(gstNumber)) {
      throw new ForbiddenException('Invalid GSTIN format');
    }

    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        name: dto.name,
        phone: dto.phone,
        addressLine1: dto.addressLine1,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        gstNumber,
        // Auto-enable GST if a GST number is provided; otherwise leave unchanged
        gstEnabled: gstNumber ? true : undefined,
        website: dto.website,
        logoUrl: dto.logoUrl,
        invoiceFooter: dto.invoiceFooter,
        terms: dto.terms,
      },
    });
  }
  async getShopSettings(tenantId: string, shopId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
      select: {
        id: true,
        name: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        pincode: true,
        website: true,

        gstEnabled: true,
        gstNumber: true,

        invoicePrefix: true,
        invoiceFooter: true,
        terms: true,
        logoUrl: true,
        tagline: true,
        headerConfig: true,

        bankName: true,
        accountNumber: true,
        ifscCode: true,
        branchName: true,

        repairInvoiceNumberingMode: true,
        repairGstDefault: true,
      },
    });

    if (!shop) {
      throw new ForbiddenException('Shop not found');
    }

    return shop;
  }
  async updateShopSettings(
    tenantId: string,
    role: string,
    shopId: string,
    dto: UpdateShopSettingsDto,
  ) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only owner can update shop settings');
    }

    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
    });

    if (!shop) {
      throw new ForbiddenException('Shop not found');
    }
    // GST business rules

    if (dto.gstEnabled === true) {
      if (!dto.gstNumber) {
        throw new ForbiddenException('GST number required when GST is enabled');
      }

      if (!isValidIndianGSTIN(dto.gstNumber)) {
        throw new ForbiddenException('Invalid GSTIN format');
      }
    }

    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        name: dto.name,
        phone: dto.phone,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        website: dto.website,

        gstEnabled: dto.gstEnabled,
        gstNumber: dto.gstNumber,

        invoiceFooter: dto.invoiceFooter,
        terms: dto.terms,
        logoUrl: dto.logoUrl,

        invoicePrinterType: dto.invoicePrinterType,
        invoiceTemplate: dto.invoiceTemplate,
        jobCardPrinterType: dto.jobCardPrinterType,
        jobCardTemplate: dto.jobCardTemplate,
        headerConfig: dto.headerConfig,
        tagline: dto.tagline,

        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        ifscCode: dto.ifscCode,

        branchName: dto.branchName,

        repairInvoiceNumberingMode: dto.repairInvoiceNumberingMode,
        repairGstDefault: dto.repairGstDefault,
      },
    });
  }

  /**
   * Get all document numbering settings for a shop
   * Returns existing settings or creates defaults for missing document types
   */
  async getDocumentSettings(tenantId: string, shopId: string) {
    // Verify shop belongs to tenant
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
    });

    if (!shop) {
      throw new ForbiddenException('Shop not found');
    }

    // Fetch all existing settings
    let settings = await this.prisma.shopDocumentSetting.findMany({
      where: { shopId },
      orderBy: { documentType: 'asc' },
    });

    // If no settings exist, create defaults for all document types
    const defaultSettings = [
      {
        shopId,
        documentType: DocumentType.SALES_INVOICE,
        prefix: shop.invoicePrefix || 'HP',
        separator: '-',
        documentCode: 'SI',
        yearFormat: YearFormat.FY,
        numberLength: 4,
        resetPolicy: ResetPolicy.YEARLY,
      },
      {
        shopId,
        documentType: DocumentType.REPAIR_INVOICE,
        prefix: shop.invoicePrefix || 'HP',
        separator: '-',
        documentCode: 'RI',
        yearFormat: YearFormat.FY,
        numberLength: 4,
        resetPolicy: ResetPolicy.YEARLY,
      },
      {
        shopId,
        documentType: DocumentType.PURCHASE_INVOICE,
        prefix: shop.invoicePrefix || 'HP',
        separator: '-',
        documentCode: 'PI',
        yearFormat: YearFormat.FY,
        numberLength: 4,
        resetPolicy: ResetPolicy.YEARLY,
      },
      {
        shopId,
        documentType: DocumentType.JOB_CARD,
        prefix: shop.invoicePrefix || 'HP',
        separator: '-',
        documentCode: 'JC',
        yearFormat: YearFormat.FY,
        numberLength: 4,
        resetPolicy: ResetPolicy.YEARLY,
      },
      {
        shopId,
        documentType: DocumentType.RECEIPT,
        prefix: shop.invoicePrefix || 'HP',
        separator: '-',
        documentCode: 'R',
        yearFormat: YearFormat.FY,
        numberLength: 4,
        resetPolicy: ResetPolicy.YEARLY,
      },
      {
        shopId,
        documentType: DocumentType.QUOTATION,
        prefix: shop.invoicePrefix || 'HP',
        separator: '-',
        documentCode: 'Q',
        yearFormat: YearFormat.FY,
        numberLength: 4,
        resetPolicy: ResetPolicy.YEARLY,
      },
      {
        shopId,
        documentType: DocumentType.PURCHASE_ORDER,
        prefix: shop.invoicePrefix || 'HP',
        separator: '-',
        documentCode: 'PO',
        yearFormat: YearFormat.FY,
        numberLength: 4,
        resetPolicy: ResetPolicy.YEARLY,
      },
    ];

    if (settings.length === 0) {
      await this.prisma.shopDocumentSetting.createMany({
        data: defaultSettings,
      });
    } else {
      // Lazy migration: Check if any default type is missing and create it
      const existingTypes = new Set(settings.map((s) => s.documentType));
      const missingSettings = defaultSettings.filter(
        (ds) => !existingTypes.has(ds.documentType),
      );

      if (missingSettings.length > 0) {
        await this.prisma.shopDocumentSetting.createMany({
          data: missingSettings,
        });
      }
    }

    // Re-fetch to ensure complete list and order
    settings = await this.prisma.shopDocumentSetting.findMany({
      where: { shopId },
      orderBy: { documentType: 'asc' },
    });

    return settings;
  }

  /**
   * Update a specific document type setting for a shop
   * Validates that locked fields (prefix, documentCode) are not changed if documents exist
   */
  async updateDocumentSetting(
    tenantId: string,
    role: string,
    shopId: string,
    documentType: DocumentType,
    dto: UpdateDocumentSettingDto,
  ) {
    if (role !== 'OWNER' && role !== 'STAFF') {
      throw new ForbiddenException(
        'Only owner or staff can update document settings',
      );
    }

    // Verify shop belongs to tenant
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
    });

    if (!shop) {
      throw new ForbiddenException('Shop not found');
    }

    // Find or create the setting
    const existing = await this.prisma.shopDocumentSetting.findUnique({
      where: {
        shopId_documentType: {
          shopId,
          documentType,
        },
      },
    });

    // If documents exist, check if we can allow modification based on reset policy
    if (existing && existing.currentNumber > 0) {
      let isLocked = false;
      const today = new Date();

      if (existing.resetPolicy === 'YEARLY') {
        // Locked if invoices exist in current financial year
        const currentFY = getFinancialYear(today);
        if (existing.currentYear === currentFY) {
          isLocked = true;
        }
      } else if (existing.resetPolicy === 'MONTHLY') {
        // Locked if invoices exist in current month
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const currentMonthKey = `${year}-${month}`;
        if (existing.currentYear === currentMonthKey) {
          isLocked = true;
        }
      } else {
        // NEVER reset: always locked if any document exists
        isLocked = true;
      }

      if (isLocked) {
        if (dto.prefix && dto.prefix !== existing.prefix) {
          throw new ForbiddenException(
            'Cannot change prefix: Documents have already been generated in the current financial period',
          );
        }
        if (dto.documentCode && dto.documentCode !== existing.documentCode) {
          throw new ForbiddenException(
            'Cannot change document code: Documents have already been generated in the current financial period',
          );
        }
      }
    }

    // Upsert the setting
    return this.prisma.shopDocumentSetting.upsert({
      where: {
        shopId_documentType: {
          shopId,
          documentType,
        },
      },
      update: {
        prefix: dto.prefix,
        separator: dto.separator,
        documentCode: dto.documentCode,
        yearFormat: dto.yearFormat,
        numberLength: dto.numberLength,
        resetPolicy: dto.resetPolicy,
        currentNumber: dto.currentNumber,
        currentYear: dto.currentYear,
      },
      create: {
        shopId,
        documentType,
        prefix: dto.prefix ?? shop.invoicePrefix ?? 'HP',
        separator: dto.separator ?? '-',
        documentCode:
          dto.documentCode ??
          (documentType === DocumentType.SALES_INVOICE
            ? 'SI'
            : documentType === DocumentType.PURCHASE_INVOICE
              ? 'PI'
              : documentType === DocumentType.JOB_CARD
                ? 'JC'
                : documentType === DocumentType.RECEIPT
                  ? 'R'
                  : documentType === DocumentType.QUOTATION
                    ? 'Q'
                    : documentType === DocumentType.REPAIR_INVOICE
                      ? 'RI'
                      : 'PO'),
        yearFormat: dto.yearFormat ?? 'FY',
        numberLength: dto.numberLength ?? 4,
        resetPolicy: dto.resetPolicy ?? 'YEARLY',
      },
    });
  }
}
