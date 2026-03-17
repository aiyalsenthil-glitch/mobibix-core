import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EWayBillStatus } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { NicApiService, NicCredentials } from './nic-api.service';
import { GenerateEWayBillDto } from './dto/generate-ewb.dto';
import { CancelEWayBillDto } from './dto/cancel-ewb.dto';
import { paiseToRupees } from '../../../core/utils/currency.utils';
import { decrypt } from '../../../core/utils/crypto.utils';

const EWB_THRESHOLD_PAISE = 50_000 * 100; // ₹50,000 in paise
const EWB_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const TRANS_MODE_MAP: Record<string, string> = {
  ROAD: '1',
  RAIL: '2',
  AIR: '3',
  SHIP: '4',
};

@Injectable()
export class EWayBillService {
  private readonly logger = new Logger(EWayBillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nicApi: NicApiService,
    private readonly config: ConfigService,
  ) {}

  private getCredentials(shop: { nicUsername: string | null; nicPassword: string | null; gstNumber: string | null }): NicCredentials {
    if (!shop.nicUsername || !shop.nicPassword) {
      throw new BadRequestException(
        'NIC e-waybill credentials not configured for this shop. Go to Shop Settings → GST to add them.',
      );
    }
    const secret = this.config.get<string>('NIC_CREDENTIAL_SECRET');
    if (!secret) {
      throw new Error('NIC_CREDENTIAL_SECRET not configured in environment');
    }
    return {
      username: shop.nicUsername,
      password: decrypt(shop.nicPassword, secret),
    };
  }

  // ─── Generate ────────────────────────────────────────────────────────────

  async generateEWayBill(
    tenantId: string,
    userId: string,
    invoiceId: string,
    dto: GenerateEWayBillDto,
  ) {
    const transMode = dto.transMode ?? 'ROAD';

    // 1. Validate transport mode rules
    if (transMode === 'ROAD' && !dto.vehicleNumber?.trim()) {
      throw new BadRequestException(
        'Vehicle number is required for ROAD transport',
      );
    }

    // 2. Load invoice with items and shop
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId, deletedAt: null },
      include: {
        items: true,
        shop: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    // 3. B2B check
    if (!invoice.customerGstin) {
      throw new BadRequestException(
        'E-Way Bill is only applicable for B2B invoices (customer GSTIN required)',
      );
    }

    // 4. Amount threshold
    if (invoice.totalAmount <= EWB_THRESHOLD_PAISE) {
      throw new BadRequestException(
        'E-Way Bill is required only for invoices above ₹50,000',
      );
    }

    // 5. Shop GSTIN + NIC credentials
    if (!invoice.shop.gstNumber) {
      throw new BadRequestException(
        'Shop GST number is not configured. Please update shop settings.',
      );
    }
    const credentials = this.getCredentials(invoice.shop);

    // 6. HSN validation — every item must have hsnCode
    for (const item of invoice.items) {
      if (!item.hsnCode?.trim()) {
        // Load product name for better error message
        const product = await this.prisma.shopProduct.findUnique({
          where: { id: item.shopProductId },
          select: { name: true },
        });
        throw new BadRequestException(
          `Item "${product?.name ?? item.shopProductId}" is missing an HSN code. Update the product and retry.`,
        );
      }
    }

    // 7. Duplicate check
    const existing = await this.prisma.eWayBill.findUnique({
      where: { invoiceId },
    });
    if (existing?.status === EWayBillStatus.GENERATED) {
      throw new ConflictException(
        'E-Way Bill has already been generated for this invoice',
      );
    }
    if (existing?.status === EWayBillStatus.GENERATING) {
      throw new ConflictException(
        'E-Way Bill generation is already in progress',
      );
    }

    // 8. Normalize vehicle number (strip non-alphanumeric)
    const vehicleNumber = dto.vehicleNumber
      ? dto.vehicleNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase()
      : undefined;

    // 9. Create/reset EWB record → GENERATING (race-condition guard)
    const nicRequestId = createId();
    const ewb = await this.prisma.eWayBill.upsert({
      where: { invoiceId },
      create: {
        invoiceId,
        tenantId,
        shopId: invoice.shopId,
        transMode,
        vehicleNumber,
        transporterId: dto.transporterId,
        transporterName: dto.transporterName,
        distance: dto.distance,
        nicRequestId,
        status: EWayBillStatus.GENERATING,
        createdBy: userId,
      },
      update: {
        transMode,
        vehicleNumber,
        transporterId: dto.transporterId,
        transporterName: dto.transporterName,
        distance: dto.distance,
        nicRequestId,
        status: EWayBillStatus.GENERATING,
        rawResponse: undefined,
        requestPayload: undefined,
        ewbNumber: null,
        ewbDate: null,
        validUpto: null,
        generatedAt: null,
      },
    });

    // 10. Build NIC payload
    const shop = invoice.shop;
    const invoiceDateStr = this.formatNicDate(invoice.invoiceDate);
    const totalRupees = paiseToRupees(invoice.totalAmount);
    const subTotalRupees = paiseToRupees(invoice.subTotal);
    const cgstRupees = paiseToRupees(invoice.cgst ?? 0);
    const sgstRupees = paiseToRupees(invoice.sgst ?? 0);
    const igstRupees = paiseToRupees(invoice.igst ?? 0);
    const gstRupees = paiseToRupees(invoice.gstAmount);

    const itemList = invoice.items.map((item) => ({
      productName: item.shopProductId, // resolved below if needed
      hsnCode: parseInt(item.hsnCode, 10),
      quantity: item.quantity,
      qtyUnit: 'NOS',
      taxableAmount: paiseToRupees(item.rate * item.quantity),
      cgstRate: Number(item.cgstRate),
      sgstRate: Number(item.sgstRate),
      igstRate: Number(item.igstRate),
      cessRate: 0,
    }));

    const nicPayload = {
      supplyType: 'O',
      subSupplyType: '1',
      docType: 'INV',
      docNo: invoice.invoiceNumber,
      docDate: invoiceDateStr,
      fromGstin: shop.gstNumber,
      fromTrdName: shop.name,
      fromAddr1: shop.addressLine1 ?? '',
      fromPlace: shop.city ?? '',
      fromPincode: shop.pincode ? parseInt(shop.pincode, 10) : 0,
      fromStateCode: shop.stateCode ? parseInt(shop.stateCode, 10) : 0,
      toGstin: invoice.customerGstin,
      toTrdName: invoice.customerName,
      toAddr1: '',
      toPlace: '',
      toPincode: 0,
      toStateCode: invoice.customerState ? parseInt(invoice.customerState, 10) : 0,
      transMode: TRANS_MODE_MAP[transMode] ?? '1',
      transDistance: dto.distance,
      transporterName: dto.transporterName ?? '',
      transporterId: dto.transporterId ?? '',
      transDocNo: '',
      transDocDate: '',
      vehicleNo: vehicleNumber ?? '',
      vehicleType: 'R',
      itemList,
      totalValue: subTotalRupees,
      cgstValue: cgstRupees,
      sgstValue: sgstRupees,
      igstValue: igstRupees,
      cessValue: 0,
      cessNonAdvolValue: 0,
      otherValue: 0,
      totInvValue: totalRupees,
    };

    // 11. Call NIC API — on failure update status=FAILED
    let nicResponse: any;
    try {
      nicResponse = await this.nicApi.generateEWayBill(
        tenantId,
        shop.gstNumber!,
        credentials,
        nicPayload,
      );
    } catch (err) {
      await this.prisma.eWayBill.update({
        where: { id: ewb.id },
        data: {
          status: EWayBillStatus.FAILED,
          rawResponse: { error: err.message },
          requestPayload: nicPayload as any,
        },
      });
      throw err;
    }

    // 12. Parse NIC dates and update record in a transaction
    const ewbDate = this.parseNicDate(nicResponse.ewayBillDate);
    const validUpto = this.parseNicDate(nicResponse.validUpto);

    const updated = await this.prisma.$transaction(async (tx) => {
      return tx.eWayBill.update({
        where: { id: ewb.id },
        data: {
          ewbNumber: String(nicResponse.ewayBillNo),
          ewbDate,
          validUpto,
          status: EWayBillStatus.GENERATED,
          generatedAt: new Date(),
          rawResponse: nicResponse as any,
          requestPayload: nicPayload as any,
        },
      });
    });

    this.logger.log(
      `EWB generated: ${updated.ewbNumber} for invoice ${invoiceId}`,
    );
    return updated;
  }

  // ─── Cancel ──────────────────────────────────────────────────────────────

  async cancelEWayBill(
    tenantId: string,
    ewbId: string,
    dto: CancelEWayBillDto,
  ) {
    const ewb = await this.prisma.eWayBill.findFirst({
      where: { id: ewbId, tenantId },
      include: { invoice: { include: { shop: true } } },
    });
    if (!ewb) throw new NotFoundException('E-Way Bill not found');

    if (ewb.status !== EWayBillStatus.GENERATED) {
      throw new BadRequestException(
        'Only a GENERATED E-Way Bill can be cancelled',
      );
    }

    const ageMs = Date.now() - (ewb.generatedAt?.getTime() ?? 0);
    if (ageMs > EWB_CANCEL_WINDOW_MS) {
      throw new BadRequestException(
        'E-Way Bill can only be cancelled within 24 hours of generation',
      );
    }

    const shopGstin = ewb.invoice.shop.gstNumber;
    if (!shopGstin) throw new BadRequestException('Shop GSTIN not found');
    const credentials = this.getCredentials(ewb.invoice.shop);

    await this.nicApi.cancelEWayBill(
      tenantId,
      shopGstin,
      credentials,
      ewb.ewbNumber!,
      dto.cancelRsnCode,
      dto.cancelRmrk ?? '',
    );

    return this.prisma.eWayBill.update({
      where: { id: ewbId },
      data: {
        status: EWayBillStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: dto.cancelRmrk,
      },
    });
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  async getByInvoice(tenantId: string, invoiceId: string) {
    return this.prisma.eWayBill.findFirst({
      where: { invoiceId, tenantId },
    });
  }

  async list(
    tenantId: string,
    shopId: string,
    page = 1,
    status?: EWayBillStatus,
    limit = 20,
  ) {
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const where = {
      tenantId,
      shopId,
      ...(status ? { status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.eWayBill.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: {
          invoice: { select: { invoiceNumber: true, customerName: true, totalAmount: true } },
        },
      }),
      this.prisma.eWayBill.count({ where }),
    ]);

    return { items, total, page, totalPages: Math.ceil(total / safeLimit) };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private formatNicDate(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  private parseNicDate(str: string): Date {
    // NIC format: "15/03/2026 10:30:00"
    const [datePart, timePart] = str.split(' ');
    const [dd, mm, yyyy] = datePart.split('/');
    return new Date(`${yyyy}-${mm}-${dd}T${timePart ?? '00:00:00'}+05:30`);
  }
}
