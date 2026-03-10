import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BillingService } from '../../../core/sales/billing.service';
import * as crypto from 'crypto';
import { CreateJobCardDto } from '../jobcard/dto/create-job-card.dto';
import {
  JobStatus,
  InvoiceStatus,
  Prisma,
  DocumentType,
  InvoiceType,
  RepairInvoiceNumberingMode,
  ProductType,
  FinanceRefType,
  ReceiptType,
  PaymentMode,
} from '@prisma/client';
import { UpdateJobCardDto } from '../jobcard/dto/update-job-card.dto';
import {
  generateJobCardNumber,
  getFinancialYear,
} from '../../../common/utils/invoice-number.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobStatusChangedEvent } from '../../../core/events/crm.events';
import { JobStatusValidator } from './job-status-validator.service';
import { DocumentNumberService } from '../../../common/services/document-number.service';
import { StockService } from '../../../core/stock/stock.service';
import { StockValidationService } from '../../../core/stock/stock-validation.service';
import { FollowUpsService } from '../../../core/follow-ups/follow-ups.service';

const AUTO_FOLLOW_UP_DAYS = 7;

@Injectable()
export class JobCardsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private statusValidator: JobStatusValidator,
    private documentNumberService: DocumentNumberService,
    private stockService: StockService,
    private stockValidation: StockValidationService,
    private billingService: BillingService,
    private followUpsService: FollowUpsService,
  ) {}

  private async validateStaffAssignment(
    tenantId: string,
    shopId: string,
    userId: string,
  ) {
    const staff = await this.prisma.shopStaff.findFirst({
      where: {
        tenantId,
        shopId,
        userId,
        isActive: true,
      },
    });

    if (!staff) {
      // Also allow OWNER to be assigned even if not separately in ShopStaff?
      // Usually Owners are not in ShopStaff table unless explicitly added.
      // Let's check UserTenant for OWNER role as fallback.
      const owner = await this.prisma.userTenant.findFirst({
        where: {
          tenantId,
          userId,
          role: 'OWNER',
        },
      });

      if (!owner) {
        throw new BadRequestException(
          'Assigned user is not a valid staff member of this shop',
        );
      }
    }
  }

  async assertAccess(user: any, shopId: string) {
    // OWNER → any shop under tenant
    if (user.role === 'OWNER') {
      const shop = await this.prisma.shop.findFirst({
        where: {
          id: shopId,
          tenantId: user.tenantId,
        },
      });

      if (!shop) {
        // Check if tenant has any shops
        const shopCount = await this.prisma.shop.count({
          where: { tenantId: user.tenantId },
        });

        if (shopCount === 0) {
          throw new BadRequestException(
            'NO_SHOPS_FOUND|Create a shop to start creating job cards.|/mobileshop/shops',
          );
        }

        console.error(
          `[JobCardsService] Shop Access Failed for OWNER. ShopId: ${shopId}, UserTenant: ${user.tenantId}`,
        );
        const actualShop = await this.prisma.shop.findUnique({
          where: { id: shopId },
        });
        if (actualShop) {
          console.error(
            `[JobCardsService] Shop Found but tenant mismatch. ShopTenant: ${actualShop.tenantId}`,
          );
        } else {
          console.error(`[JobCardsService] Shop NOT FOUND in DB.`);
        }
        throw new BadRequestException('Shop not accessible');
      }

      return;
    }

    // STAFF → only assigned shop
    if (user.role === 'STAFF') {
      const staff = await this.prisma.shopStaff.findFirst({
        where: {
          userId: user.sub,
          shopId,
          tenantId: user.tenantId,
          role: 'STAFF',
          isActive: true,
        },
      });

      if (!staff) {
        throw new BadRequestException('Shop not accessible');
      }

      return;
    }

    throw new BadRequestException('Access denied');
  }

  async nextJobNumber(shopId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId },
      select: { invoicePrefix: true },
    });

    if (!shop) {
      throw new BadRequestException('Shop not found');
    }

    const today = new Date();
    const fy = getFinancialYear(today);
    // fy will be "202526" for Apr2025-Mar2026, "202627" for Apr2026-Mar2027, etc.

    // Find last job card for THIS FINANCIAL YEAR
    // IMPORTANT: Sequence resets to 0001 on each financial year (April 1)
    // When FY changes, this returns null, causing sequence to start at 1 (fresh start)
    const lastJob = await this.prisma.jobCard.findFirst({
      where: {
        shopId,
        jobNumber: { contains: `-J-${fy}-` }, // Only finds job cards from current FY
      },
      orderBy: { createdAt: 'desc' },
      select: { jobNumber: true },
    });

    let sequenceNumber = 1;
    if (lastJob) {
      const parts = lastJob.jobNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10); // Extract 0001, 0002, etc.
      sequenceNumber = lastSeq + 1; // Next sequence number
    }
    // If no job cards exist for this FY yet, sequenceNumber stays 1 (fresh start)

    return generateJobCardNumber(shop.invoicePrefix, sequenceNumber, today);
  }

  /**
   * 💰 ADD ADVANCE (Strict Top-up)
   */
  async addAdvance(
    user,
    shopId: string,
    jobId: string,
    amount: number,
    mode: PaymentMode = PaymentMode.CASH,
  ) {
    await this.assertAccess(user, shopId);

    if (amount <= 0) {
      throw new BadRequestException('Advance amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const job = await tx.jobCard.findUnique({
        where: { id: jobId, tenantId: user.tenantId },
      });

      if (!job) throw new NotFoundException('Job not found');

      // GUARD: Status Check
      if (
        job.status === 'READY' ||
        job.status === 'DELIVERED' ||
        job.status === 'CANCELLED'
      ) {
        throw new BadRequestException(
          `Cannot add advance when job is ${job.status}`,
        );
      }

      const advancePaisa = Math.round(amount * 100);
      const receiptId = crypto.randomUUID();

      // 1. Create Financial Entry (IN)
      await tx.financialEntry.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          type: 'IN',
          amount: advancePaisa,
          mode,
          referenceType: FinanceRefType.JOBCARD_ADVANCE,
          referenceId: job.id,
          note: `Advance added for Job ${job.jobNumber}`,
        },
      });

      // 2. Create Receipt
      const receipt = await tx.receipt.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          receiptId,
          printNumber: `ADV-ADD-${job.jobNumber}-${Date.now().toString().slice(-4)}`,
          receiptType: ReceiptType.JOB_ADVANCE,
          amount: advancePaisa,
          paymentMethod: mode,
          customerId: job.customerId,
          customerName: job.customerName,
          customerPhone: job.customerPhone,
          linkedJobCardId: job.id,
          status: 'ACTIVE',
          narration: 'Additional Advance',
        },
      });

      // 3. Update JobCard
      const updatedJob = await tx.jobCard.update({
        where: { id: jobId },
        data: {
          advancePaid: { increment: amount },
        },
      });

      return { job: updatedJob, receipt };
    });
  }

  /**
   * 💸 REFUND ADVANCE (Strict Refund)
   */
  async refundAdvance(
    user,
    shopId: string,
    jobId: string,
    amount: number,
    mode: PaymentMode = PaymentMode.CASH,
  ) {
    await this.assertAccess(user, shopId);

    if (amount <= 0) {
      throw new BadRequestException('Refund amount must be positive');
    }

    return this.prisma.$transaction(async (tx) => {
      const job = await tx.jobCard.findUnique({
        where: { id: jobId, tenantId: user.tenantId },
      });

      if (!job) throw new NotFoundException('Job not found');

      // GUARD: Balance Check
      if ((job.advancePaid || 0) < amount) {
        throw new BadRequestException(
          `Cannot refund ${amount}. Current advance is only ${job.advancePaid}`,
        );
      }

      // GUARD: Status Check
      // Allowed: CANCELLED (cleanup), CREATED/RECEIVED/IN_PROGRESS (correction)
      // Blocked: DELIVERED (too late)
      if (job.status === 'DELIVERED') {
        throw new BadRequestException(
          `Cannot refund advance when job is ${job.status}`,
        );
      }

      const refundPaisa = Math.round(amount * 100);

      // 1. Create Financial Entry (OUT)
      await tx.financialEntry.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          type: 'OUT',
          amount: refundPaisa,
          mode,
          referenceType: FinanceRefType.JOBCARD_ADVANCE,
          referenceId: job.id,
          note: `Advance refund for Job ${job.jobNumber}`,
        },
      });

      // 2. Update JobCard
      const updatedJob = await tx.jobCard.update({
        where: { id: jobId },
        data: {
          advancePaid: { decrement: amount },
        },
      });

      return updatedJob;
    });
  }
  async create(user, shopId: string, dto: CreateJobCardDto) {
    await this.assertAccess(user, shopId);
    let customer: { name: string; phone: string } | null = null;

    if (dto.customerId) {
      customer = await this.prisma.party.findFirst({
        where: {
          id: dto.customerId,
          tenantId: user.tenantId,
          isActive: true,
          partyType: { in: ['CUSTOMER', 'BOTH'] },
        },
      });

      if (!customer) {
        throw new BadRequestException('Invalid customer');
      }
    }

    if (!customer && (!dto.customerName || !dto.customerPhone)) {
      throw new BadRequestException('Customer details required');
    }

    const customerName = customer ? customer.name : dto.customerName!;
    const customerPhone = customer ? customer.phone : dto.customerPhone!;

    if (dto.assignedToUserId) {
      await this.validateStaffAssignment(
        user.tenantId,
        shopId,
        dto.assignedToUserId,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 0. CHECK FOR DELETION REQUEST (Soft Lock)
      const tenant = (await tx.tenant.findUnique({
        where: { id: user.tenantId },
        select: { deletionRequestPending: true } as any,
      })) as any;
      if (tenant?.deletionRequestPending) {
        throw new BadRequestException(
          'Your account is currently pending deletion and most operations are restricted. Please contact support if you need to cancel the request.',
        );
      }

      // 1. Create Job Card
      const job = await tx.jobCard.create({
        data: {
          tenantId: user.tenantId,
          shopId,
          jobNumber: await this.nextJobNumber(shopId),
          publicToken: crypto.randomUUID(),
          status: JobStatus.RECEIVED,

          createdByUserId: user.sub,
          createdByName: user.name ?? user.email ?? 'Staff',

          customerId: dto.customerId ?? null,
          customerName,
          customerPhone,
          customerAltPhone: customer ? null : dto.customerAltPhone,

          deviceType: dto.deviceType,
          deviceBrand: dto.deviceBrand,
          deviceModel: dto.deviceModel,
          deviceSerial: dto.deviceSerial,
          devicePassword: dto.devicePassword,

          customerComplaint: dto.customerComplaint,
          physicalCondition: dto.physicalCondition,

          estimatedCost: dto.estimatedCost,
          diagnosticCharge: dto.diagnosticCharge,
          advancePaid: dto.advancePaid || 0, // Ensure numeric
          billType: dto.billType ?? 'WITHOUT_GST',
          estimatedDelivery: dto.estimatedDelivery
            ? new Date(dto.estimatedDelivery)
            : null,
          assignedToUserId: dto.assignedToUserId ?? null,
        },
      });

      // 2. 🛡️ STRICT ACCOUNTING: Create Financial Records for Advance
      if (dto.advancePaid && dto.advancePaid > 0) {
        const advancePaisa = Math.round(dto.advancePaid * 100);

        // A. Create Receipt
        // Needs a print number. We will generate UUID for receiptId.
        // For now, we use a temporary placeholder for printNumber or rely on a different mechanisms.
        // Ideally we used DocumentNumberService but we are in a transaction.

        const receiptId = crypto.randomUUID();

        // B. Create Financial Entry (Cash In)
        await tx.financialEntry.create({
          data: {
            tenantId: user.tenantId,
            shopId,
            type: 'IN',
            amount: advancePaisa,
            mode: PaymentMode.CASH, // Default to CASH for now
            referenceType: FinanceRefType.JOBCARD_ADVANCE,
            referenceId: job.id,
            note: `Advance for Job ${job.jobNumber}`,
          },
        });

        // C. Create Receipt
        await tx.receipt.create({
          data: {
            tenantId: user.tenantId,
            shopId,
            receiptId, // Public ID
            printNumber: `ADV-${job.jobNumber}`, // Temporary print number based on job
            receiptType: ReceiptType.JOB_ADVANCE,
            amount: advancePaisa,
            paymentMethod: PaymentMode.CASH,
            customerId: job.customerId,
            customerName: job.customerName,
            customerPhone: job.customerPhone,
            linkedJobCardId: job.id,
            status: 'ACTIVE',
            narration: 'Initial Advance',
          },
        });
      }

      return job;
    });
  }

  /**
   * 🛡️ CREATE WARRANTY REWORK JOB
   * - Strict validation: DELIVERED, Warranty Active, Enabled in Settings
   * - Creates NEW JobCard linked via notes
   */
  async createWarrantyJob(user, shopId: string, originalJobId: string) {
    await this.assertAccess(user, shopId);

    // 1. Fetch Original Job & Shop Settings
    const originalJob = await this.prisma.jobCard.findUnique({
      where: { id: originalJobId, shopId, tenantId: user.tenantId },
      include: { shop: true },
    });

    if (!originalJob)
      throw new NotFoundException('Original Job Card not found');

    // 2. Validate Settings
    const headerConfig = originalJob.shop.headerConfig as any;
    const isWarrantyEnabled = headerConfig?.enableWarrantyJobs === true;

    if (!isWarrantyEnabled) {
      throw new BadRequestException(
        'Warranty jobs are not enabled for this shop',
      );
    }

    // 3. Validate Eligibility
    if (originalJob.status !== JobStatus.DELIVERED) {
      throw new BadRequestException(
        'Warranty can only be claimed on DELIVERED jobs',
      );
    }

    const warrantyDuration = originalJob.warrantyDuration || 0;
    if (warrantyDuration <= 0) {
      throw new BadRequestException('This job has no warranty coverage');
    }

    // Check Expiry using explicit deliveredAt anchor
    const deliveredAt = originalJob.deliveredAt;

    if (!deliveredAt) {
      throw new BadRequestException(
        'Cannot claim warranty: Original delivery date missing.',
      );
    }

    const expiryDate = new Date(deliveredAt);
    expiryDate.setDate(expiryDate.getDate() + warrantyDuration);

    if (new Date() > expiryDate) {
      throw new BadRequestException('Warranty period has expired');
    }

    // 4. Check for existing active warranty linking to this job?
    // Difficult without a structured link. We use Notes linkage.
    // "Warranty rework for JobCard <JOB_NUMBER>"
    // We can skip this check or do a rough string search.
    // Strict check is better:
    const existingKw = `Warranty rework for JobCard ${originalJob.jobNumber}`;
    const existing = await this.prisma.jobCard.findFirst({
      where: {
        shopId,
        notes: { contains: existingKw },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Active warranty job (${existing.jobNumber}) already exists`,
      );
    }

    // 5. Create Warranty Job
    const newJobNumber = await this.nextJobNumber(shopId);

    return this.prisma.jobCard.create({
      data: {
        tenantId: user.tenantId,
        shopId,
        jobNumber: newJobNumber,
        publicToken: crypto.randomUUID(),
        status: JobStatus.RECEIVED,

        createdByUserId: user.sub,
        createdByName: user.name ?? user.email ?? 'Staff',

        customerId: originalJob.customerId,
        customerName: originalJob.customerName,
        customerPhone: originalJob.customerPhone,
        customerAltPhone: originalJob.customerAltPhone,

        deviceType: originalJob.deviceType,
        deviceBrand: originalJob.deviceBrand,
        deviceModel: originalJob.deviceModel,
        deviceSerial: originalJob.deviceSerial,
        devicePassword: originalJob.devicePassword,
        physicalCondition: originalJob.physicalCondition,

        customerComplaint: `(Rework) ${originalJob.customerComplaint}`,

        // Warranty Specifics
        estimatedCost: 0, // Free by default
        diagnosticCharge: 0,
        advancePaid: 0,
        billType: 'WITHOUT_GST', // Default to tax-free service
        warrantyDuration: 0, // Warranty on warranty? Usually no.

        notes: `${existingKw}. Original Issue: ${originalJob.customerComplaint}`,
      },
    });
  }

  /**
   * 🛒 ADD PART TO JOB CARD
   * - Deducts stock immediately
   * - Snapshots cost price
   */
  async addPart(
    user,
    shopId: string,
    jobId: string,
    dto: { productId: string; quantity: number },
  ) {
    await this.assertAccess(user, shopId);

    const job = await this.prisma.jobCard.findFirst({
      where: { id: jobId, shopId },
    });

    if (!job)
      throw new NotFoundException(
        `Job card not found: ${jobId} in shop ${shopId}`,
      );

    // 🛡️ GUARD: Cannot add parts after READY or terminal states
    if (
      ['READY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'SCRAPPED'].includes(
        job.status,
      )
    ) {
      throw new BadRequestException(
        'Cannot add parts: Job has moved past the parts stage. Create a new job or use credit note for changes.',
      );
    }

    const product = await this.prisma.shopProduct.findFirst({
      where: { id: dto.productId, shopId },
    });

    if (!product)
      throw new NotFoundException(
        `Product not found: ${dto.productId} in shop ${shopId}`,
      );

    // 🛡️ BUSINESS RULE: SERVICE products cannot be added as parts
    // Services are billed separately, never tracked in inventory
    if (product.type === ProductType.SERVICE) {
      throw new BadRequestException(
        `"${product.name}" is a service item and cannot be added as a repair part. Services are billed separately.`,
      );
    }

    // ✅ NEW: Validate stock availability BEFORE creating part entry
    // Prevents negative stock by checking balance upfront
    await this.stockValidation.validateStockOut(
      user.tenantId,
      dto.productId,
      dto.quantity,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Lock Product and Validate Stock
      const product = await tx.shopProduct.findFirst({
        where: { id: dto.productId, tenantId: user.tenantId, shopId },
      });
      if (!product) throw new NotFoundException('Product not found');
      if (product.type === 'SERVICE')
        throw new BadRequestException('Cannot add SERVICE as a part');

      // Validate stock (Scalar check is fast)
      if ((product as any).quantity < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${(product as any).quantity}`,
        );
      }

      // 2. Record Stock Out Immediately (Atomic)
      await this.stockService.recordStockOut(
        user.tenantId,
        shopId,
        dto.productId,
        dto.quantity,
        'REPAIR',
        jobId,
        undefined, // costPerUnit
        undefined, // imeis
        tx,
      );

      // 3. Create or Update JobCardPart
      const part = await tx.jobCardPart.upsert({
        where: {
          jobCardId_shopProductId: {
            jobCardId: jobId,
            shopProductId: dto.productId,
          },
        },
        update: {
          quantity: { increment: dto.quantity },
          isDeducted: true,
        } as any,
        create: {
          jobCardId: jobId,
          shopProductId: dto.productId,
          quantity: dto.quantity,
          costPrice: (product as any).avgCost,
          isDeducted: true,
        } as any,
      });

      return part;
    });
  }

  /**
   * ❌ CANCEL JOB CARD
   * - Restores all used parts to inventory
   * - Voids linked invoice if exists
   * - Updates status to CANCELLED
   */
  async cancelJob(user, shopId: string, jobId: string, reason?: string) {
    await this.assertAccess(user, shopId);

    const job = await this.prisma.jobCard.findUnique({
      where: { id: jobId, shopId, tenantId: user.tenantId },
      include: {
        parts: {
          include: { product: true },
        },
        invoices: true,
      },
    });

    if (!job) throw new NotFoundException('Job card not found');

    // 🛡️ GUARD: Cannot cancel if already delivered or cancelled
    if (['DELIVERED', 'CANCELLED', 'RETURNED'].includes(job.status)) {
      throw new BadRequestException(
        `Cannot cancel job in ${job.status} status. Use proper return/void flow instead.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Step 1: Restore all used parts to inventory
      for (const part of job.parts) {
        if (
          (part as any).isDeducted &&
          (part as any).product.type !== ProductType.SERVICE
        ) {
          await this.stockService.recordStockIn(
            user.tenantId,
            shopId,
            part.shopProductId,
            part.quantity,
            'ADJUSTMENT',
            jobId,
            part.costPrice ?? undefined,
            undefined, // IMEIs
            tx,
          );
        }
      }

      // Step 2: Void linked invoice if exists
      if (job.invoices && job.invoices.length > 0) {
        // Void all linked invoices
        await tx.invoice.updateMany({
          where: { id: { in: job.invoices.map((inv) => inv.id) } },
          data: { status: InvoiceStatus.VOIDED },
        });
      }

      // Step 3: Update job status to CANCELLED
      await tx.jobCard.update({
        where: { id: jobId },
        data: {
          status: JobStatus.CANCELLED,
          notes: reason
            ? `CANCELLED: ${reason}. ${job.notes || ''}`
            : job.notes,
        },
      });

      // Step 4: Emit event for CRM/notifications
      this.eventEmitter.emit('job.cancelled', {
        tenantId: user.tenantId,
        shopId,
        jobId,
        jobNumber: job.jobNumber,
        partsRestored: job.parts.length,
      });

      return {
        success: true,
        partsRestored: job.parts.map((p) => ({
          name: p.product.name,
          quantity: p.quantity,
        })),
      };
    });
  }

  /**
   * 🗑️ REMOVE PART FROM JOB CARD
   * - Restores stock
   */
  async removePart(user, shopId: string, jobId: string, partId: string) {
    await this.assertAccess(user, shopId);

    const job = await this.prisma.jobCard.findUnique({
      where: { id: jobId, shopId, tenantId: user.tenantId },
    });
    if (!job) throw new NotFoundException('Job not found');

    // 🛡️ GUARD: Cannot remove parts after READY or terminal states
    if (
      ['READY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'SCRAPPED'].includes(
        job.status,
      )
    ) {
      throw new BadRequestException(
        'Cannot remove parts: Job has moved past the parts stage. Create a new job or use credit note for changes.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.jobCardPart.delete({
        where: { id: partId },
      });

      return { success: true };
    });
  }

  async getOne(user: any, shopId: string, id: string) {
    await this.assertAccess(user, shopId);

    const job = await this.prisma.jobCard.findFirst({
      where: {
        id,
        shopId,
        tenantId: user.tenantId,
      },
      include: {
        invoices: true,
        parts: {
          include: { product: true },
        },
      },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    // 💰 PROFIT CALCULATION (Owner Only)
    if (user.role === 'OWNER') {
      const jobPartsCostPaisa = job.parts.reduce(
        (sum, part) => sum + part.quantity * (part.costPrice || 0),
        0,
      );
      const jobPartsCostRupees = jobPartsCostPaisa / 100;

      // Revenue comes from Invoice (excluding tax).
      const revenuePaisa = job.invoices
        .filter((i) => i.status !== InvoiceStatus.VOIDED)
        .reduce((sum, i) => sum + i.subTotal, 0);

      const revenueRupees = revenuePaisa / 100;
      const profit = revenueRupees - jobPartsCostRupees;

      return {
        ...job,
        jobCost: jobPartsCostRupees, // Return Rupees
        profit: profit,
        revenue: revenueRupees,
      };
    }

    return job; // Staff don't see profit
  }

  async update(user: any, shopId: string, id: string, dto: UpdateJobCardDto) {
    await this.assertAccess(user, shopId);

    const job = await this.prisma.jobCard.findFirst({
      where: { id, shopId, tenantId: user.tenantId },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    if (
      ['DELIVERED', 'CANCELLED', 'RETURNED', 'SCRAPPED'].includes(job.status)
    ) {
      throw new BadRequestException('Job is locked');
    }

    let customer: { name: string; phone: string } | null = null;

    if (dto.customerId) {
      customer = await this.prisma.party.findFirst({
        where: {
          id: dto.customerId,
          tenantId: user.tenantId,
          isActive: true,
          partyType: { in: ['CUSTOMER', 'BOTH'] },
        },
      });

      if (!customer) {
        throw new BadRequestException('Invalid customer');
      }
    }

    const data: Record<string, any> = {};

    if (customer) {
      data.customerId = dto.customerId;
      data.customerName = customer.name;
      data.customerPhone = customer.phone;
      data.customerAltPhone = null;
    } else {
      if (dto.customerId !== undefined) {
        data.customerId = dto.customerId ?? null;
      }
      if (dto.customerName !== undefined) {
        data.customerName = dto.customerName;
      }
      if (dto.customerPhone !== undefined) {
        data.customerPhone = dto.customerPhone;
      }
      if (dto.customerAltPhone !== undefined) {
        data.customerAltPhone = dto.customerAltPhone;
      }
    }

    if (dto.deviceType !== undefined) data.deviceType = dto.deviceType;
    if (dto.deviceBrand !== undefined) data.deviceBrand = dto.deviceBrand;
    if (dto.deviceModel !== undefined) data.deviceModel = dto.deviceModel;
    if (dto.deviceSerial !== undefined) data.deviceSerial = dto.deviceSerial;
    if (dto.devicePassword !== undefined)
      data.devicePassword = dto.devicePassword;
    if (dto.customerComplaint !== undefined)
      data.customerComplaint = dto.customerComplaint;
    if (dto.physicalCondition !== undefined)
      data.physicalCondition = dto.physicalCondition;
    if (dto.estimatedCost !== undefined) data.estimatedCost = dto.estimatedCost;
    if (dto.diagnosticCharge !== undefined)
      data.diagnosticCharge = dto.diagnosticCharge;
    if (dto.advancePaid !== undefined) data.advancePaid = dto.advancePaid;
    if (dto.laborCharge !== undefined) {
      if (dto.laborCharge < 0) {
        throw new BadRequestException('Labor charge cannot be negative');
      }
      data.laborCharge = dto.laborCharge;
    }
    if (dto.billType !== undefined) data.billType = dto.billType;
    if (dto.estimatedDelivery !== undefined)
      data.estimatedDelivery = dto.estimatedDelivery
        ? new Date(dto.estimatedDelivery)
        : null;

    if (dto.assignedToUserId !== undefined) {
      if (dto.assignedToUserId) {
        await this.validateStaffAssignment(
          user.tenantId,
          shopId,
          dto.assignedToUserId,
        );
        data.assignedToUserId = dto.assignedToUserId;
      } else {
        data.assignedToUserId = null;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Calculate Advance Delta 🛡️ STRICT ACCOUNTING
      if (dto.advancePaid !== undefined) {
        const oldAdvance = job.advancePaid || 0;
        const newAdvance = dto.advancePaid;
        const delta = newAdvance - oldAdvance;

        if (delta < 0) {
          // BLOCK REDUCTION
          throw new BadRequestException(
            'Cannot reduce advance amount directly. Please use the Refund flow to return money to customer.',
          );
        }

        if (delta > 0) {
          const deltaPaisa = Math.round(delta * 100);
          const receiptId = crypto.randomUUID();

          // A. Create Financial Entry (Cash In)
          await tx.financialEntry.create({
            data: {
              tenantId: user.tenantId,
              shopId,
              type: 'IN',
              amount: deltaPaisa,
              mode: 'CASH', // Assumption: Update via UI defaults to CASH for now
              referenceType: 'JOBCARD_ADVANCE',
              referenceId: job.id,
              note: `Advance top-up for Job ${job.jobNumber}`,
            },
          });

          // B. Create Receipt
          await tx.receipt.create({
            data: {
              tenantId: user.tenantId,
              shopId,
              receiptId,
              printNumber: `ADV-TOP-${job.jobNumber}-${Date.now().toString().slice(-4)}`,
              receiptType: 'JOB_ADVANCE',
              amount: deltaPaisa,
              paymentMethod: 'CASH',
              customerId: job.customerId,
              customerName: job.customerName,
              customerPhone: job.customerPhone,
              linkedJobCardId: job.id,
              status: 'ACTIVE',
              narration: 'Advance top-up',
            },
          });
        }
      }

      // 2. Perform Update
      return tx.jobCard.update({
        where: { id },
        data,
      });
    });
  }

  async list(
    user,
    shopId: string,
    filters?: {
      status?: JobStatus;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    try {
      await this.assertAccess(user, shopId);
    } catch (e) {
      if (e.message?.startsWith('NO_SHOPS_FOUND|')) {
        const [, message, createShopUrl] = e.message.split('|');
        return {
          jobCards: [],
          empty: true,
          message,
          createShopUrl,
        };
      }
      throw e;
    }

    const where: Prisma.JobCardWhereInput = {
      tenantId: user.tenantId,
      shopId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      const search = filters.search.trim();
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { jobNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [jobCards, total] = await Promise.all([
      this.prisma.jobCard.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filters?.skip,
        take: filters?.take,
        include: {
          invoices: true,
          parts: user.role === 'OWNER' ? { include: { product: true } } : false,
        },
      }),
      this.prisma.jobCard.count({ where }),
    ]);

    return { jobCards, total, empty: total === 0 };
  }

  /**
   * 🎯 UPDATE JOB STATUS
   */
  /**
   * 🎯 UPDATE JOB STATUS
   */
  async updateStatus(
    user,
    shopId: string,
    id: string,
    newStatus: JobStatus,
    refundDetails?: { amount: number; mode: PaymentMode },
  ) {
    await this.assertAccess(user, shopId);

    // 1️⃣ Fetch job with all nested relations needed for handlers
    const job = await this.prisma.jobCard.findUnique({
      where: { id, tenantId: user.tenantId },
      include: {
        shop: true,
        invoices: true,
        parts: { include: { product: true } },
      },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    // 2️⃣ Validate state transition (throws if invalid)
    this.statusValidator.validateTransition(job.status, newStatus);

    return this.prisma.$transaction(async (tx) => {
      // 3️⃣ HANDLE CANCELLATION / RETURN RISK MITIGATION
      if (['CANCELLED', 'RETURNED', 'SCRAPPED'].includes(newStatus)) {
        // [Risk F-02] Finance Reconciliation
        const advancePaid = job.advancePaid || 0;

        if (advancePaid > 0) {
          if (!refundDetails) {
            throw new BadRequestException(
              `Cannot move job to ${newStatus} with active advances (₹${advancePaid}). Refund details required.`,
            );
          }

          if (Math.abs(refundDetails.amount - advancePaid) > 0.01) {
            throw new BadRequestException(
              `Refund amount (₹${refundDetails.amount}) must match the active advance (₹${advancePaid}).`,
            );
          }

          // Process Refund (Atomic)
          const refundPaisa = Math.round(refundDetails.amount * 100);

          // A. Financial Entry (OUT)
          await tx.financialEntry.create({
            data: {
              tenantId: user.tenantId,
              shopId,
              type: 'OUT',
              amount: refundPaisa,
              mode: refundDetails.mode,
              referenceType: FinanceRefType.JOBCARD_ADVANCE,
              referenceId: job.id,
              note: `Advance refund on Transition to ${newStatus} for Job ${job.jobNumber}`,
            },
          });

          // B. Update Job Advance to 0
          await tx.jobCard.update({
            where: { id },
            data: { advancePaid: 0 },
          });
        }

        // [Risk S-01] Stock Reconciliation (Optimized via Batching)
        if (job.parts.length > 0) {
          const partsToRestore = job.parts.filter(
            (p) =>
              (p as any).isDeducted &&
              (p as any).product.type !== ProductType.SERVICE,
          );

          if (partsToRestore.length > 0) {
            await this.stockService.recordStockInBatch(
              user.tenantId,
              shopId,
              partsToRestore.map((p) => ({
                productId: p.shopProductId,
                quantity: p.quantity,
                costPerUnit: p.costPrice ?? undefined,
              })),
              'REPAIR',
              id,
              tx,
            );
          }

          // Delete all usages in one go
          await tx.jobCardPart.deleteMany({
            where: { id: { in: job.parts.map((p) => p.id) } },
          });
        }
      }

      // 4️⃣ Handle status-specific business logic
      if (newStatus === 'READY') {
        // 🚨 CRITICAL VALIDATION: Cannot mark READY without cost
        if (!job.finalCost && !job.estimatedCost && !job.laborCharge) {
          throw new BadRequestException(
            'Cannot mark job READY without cost. Please add Final Cost, Estimated Cost, or Labor Charge first.',
          );
        }

        // 🛡️ GUARD: SERVICE products cannot be in parts
        const servicePartExists = job.parts.some(
          (p) => p.product?.type === ProductType.SERVICE,
        );
        if (servicePartExists) {
          throw new BadRequestException(
            'Cannot mark READY: SERVICE products cannot be added as repair parts. Remove them and try again.',
          );
        }
      }

      // 🛑 DELIVERY GUARD
      if (newStatus === 'DELIVERED') {
        const validInvoice = job.invoices.find(
          (i) => i.status !== InvoiceStatus.VOIDED,
        );

        if (!validInvoice) {
          throw new BadRequestException(
            'Cannot deliver job without an invoice. Status must be READY first.',
          );
        }

        if (
          validInvoice.status !== InvoiceStatus.PAID &&
          validInvoice.status !== InvoiceStatus.PARTIALLY_PAID
        ) {
          if (validInvoice.status === InvoiceStatus.UNPAID) {
            throw new BadRequestException(
              'Cannot deliver job. Invoice is still DRAFT. Finalize invoice first.',
            );
          }
        }
      }

      // 🔄 HANDLE INVOICING (Pass current transaction tx)
      if (this.statusValidator.shouldCreateInvoice(newStatus)) {
        await this.handleJobReady(job, user, tx);
      } else if (this.statusValidator.shouldVoidInvoice(newStatus)) {
        await this.handleJobTermination(job, newStatus, tx);
      }

      // 5️⃣ Update status with history tracking
      const statusHistory = (job.statusHistory as any[]) || [];
      statusHistory.push({
        from: job.status,
        to: newStatus,
        timestamp: new Date().toISOString(),
        userId: user.sub,
        userName: user.name || user.email,
        refundedAdvance:
          ['CANCELLED', 'RETURNED', 'SCRAPPED'].includes(newStatus) &&
          job.advancePaid > 0
            ? job.advancePaid
            : undefined,
      });

      const updatedJob = await tx.jobCard.update({
        where: { id },
        data: {
          status: newStatus,
          statusHistory,
          ...(newStatus === 'DELIVERED' && { deliveredAt: new Date() }),
          ...(newStatus === 'SCRAPPED' && { scrappedAt: new Date() }),
        },
      });

      // 6️⃣ Emit WhatsApp event (Async, don't wait if not critical - but Nest Event Emitter is sync by default unless specified)
      // Note: eventEmitter.emit is technically synchronous unless configured otherwise.
      if (this.statusValidator.shouldTriggerWhatsApp(newStatus)) {
        this.eventEmitter.emit(
          'job.status.changed',
          new JobStatusChangedEvent(
            user.tenantId,
            shopId,
            id,
            updatedJob.customerId,
            newStatus,
            updatedJob.customerPhone,
            updatedJob.deviceModel,
          ),
        );
      }

      // 7️⃣ Auto follow-up on DELIVERED (outside transaction — non-critical)
      if (newStatus === 'DELIVERED' && updatedJob.customerId) {
        this.scheduleAutoFollowUp(
          user.tenantId,
          updatedJob.customerId,
          id,
          user.userId || user.sub,
        ).catch((err) =>
          console.error('[auto-follow-up] Failed to create:', err.message),
        );
      }

      return updatedJob;
    });
  }

  private async scheduleAutoFollowUp(
    tenantId: string,
    customerId: string,
    jobId: string,
    userId: string,
  ) {
    // Deduplicate: only one auto follow-up per job
    const existing = await this.prisma.customerFollowUp.findFirst({
      where: { tenantId, sourceJobId: jobId },
    });
    if (existing) return;

    const followUpAt = new Date();
    followUpAt.setDate(followUpAt.getDate() + AUTO_FOLLOW_UP_DAYS);

    // Fetch job details for the note
    const job = await this.prisma.jobCard.findUnique({
      where: { id: jobId },
      select: { jobNumber: true, deviceBrand: true, deviceModel: true },
    });

    await this.prisma.customerFollowUp.create({
      data: {
        tenantId,
        customerId,
        type: 'PHONE_CALL',
        purpose: `Post-repair follow-up — ${job?.deviceBrand ?? ''} ${job?.deviceModel ?? ''} (Job #${job?.jobNumber ?? jobId})`,
        followUpAt,
        status: 'PENDING',
        assignedToUserId: userId,
        sourceJobId: jobId,
      },
    });
  }

  /**
   * 🚀 AUTO-INVOICE CREATION
   * Triggered when job status becomes READY
   * Creates exactly ONE DRAFT invoice (editable)
   * POPULATES ITEMS from JobCardParts + Service Charge
   */
  /**
   * 🚀 AUTO-INVOICE CREATION
   * Triggered when job status becomes READY
   * Creates exactly ONE DRAFT invoice (editable)
   * POPULATES ITEMS from JobCardParts + Service Charge
   */
  private async handleJobReady(job: any, user?: any, tx?: any) {
    const prisma = tx || this.prisma;
    // Prevent duplicate creation
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        jobCardId: job.id,
        status: { not: InvoiceStatus.VOIDED },
      },
    });

    if (existingInvoice) {
      console.log(
        `⚠️ Job ${job.jobNumber} already has invoice, skipping auto-creation`,
      );
      return;
    }

    // Use pre-fetched shop options or fetch if missing (though updateStatus now pre-fetches)
    const shop =
      job.shop ||
      (await prisma.shop.findUnique({
        where: { id: job.shopId },
        select: {
          invoicePrefix: true,
          repairInvoiceNumberingMode: true,
          repairGstDefault: true,
          gstEnabled: true,
        },
      }));

    if (!shop) throw new BadRequestException('Shop not found');

    // Numbering Mode Logic
    const numberingMode =
      shop.repairInvoiceNumberingMode || RepairInvoiceNumberingMode.SHARED;
    const isSeparate = numberingMode === RepairInvoiceNumberingMode.SEPARATE;

    const docType = isSeparate
      ? DocumentType.REPAIR_INVOICE
      : DocumentType.SALES_INVOICE;

    const invoiceType = InvoiceType.REPAIR;
    // GST Logic: STRICTLY follow shop settings.
    // Legacy `billType` ('WITHOUT_GST') is purposefully ignored to prevent compliance leaks.
    const isGstApplicable = shop.gstEnabled ?? false;

    // Generate Document Number
    await this.documentNumberService.generateDocumentNumber(
      job.shopId,
      docType,
      new Date(),
    );

    // Calculate Totals & Items
    const itemsData: any[] = [];
    let partsSubtotalPaisa = 0; // Sum of parts only (before GST)
    let partsTaxPaisa = 0; // GST on parts

    // 1. Add Parts (physical inventory items)
    if (job.parts && job.parts.length > 0) {
      for (const part of job.parts) {
        const ratePaisa = part.product.salePrice || 0;
        const rateRupees = Math.round(ratePaisa / 100); // Convert to integer rupees for rate field
        const quantityNum = part.quantity;
        const gstRatePercent = isGstApplicable ? part.product.gstRate || 0 : 0;

        // Calculate GST-inclusive line total
        const lineSubtotalPaisa = ratePaisa * quantityNum;
        const lineTaxPaisa = Math.round(
          (lineSubtotalPaisa * gstRatePercent) / 100,
        );
        const lineTotalPaisa = lineSubtotalPaisa + lineTaxPaisa;

        itemsData.push({
          shopProductId: part.shopProductId,
          quantity: quantityNum,
          rate: rateRupees, // Store as integer rupees (matches sales.service.ts convention)
          hsnCode: part.product.hsnCode || '9987',
          gstRate: gstRatePercent,
          gstAmount: lineTaxPaisa,
          lineTotal: lineTotalPaisa,
          costPrice: part.costPrice, // SNAPSHOT: Use the cost price from JobCardPart (Paise)
        });

        partsSubtotalPaisa += lineSubtotalPaisa;
        partsTaxPaisa += lineTaxPaisa;
      }
    }

    // 2. Calculate Service Charge explicitly (no longer residual)
    const serviceChargePaisa = (job.laborCharge || 0) * 100;

    // Overwrite job.finalCost as visual record of parts+labor
    const finalCostRupees =
      Math.round(partsSubtotalPaisa / 100) + (job.laborCharge || 0);
    await prisma.jobCard.update({
      where: { id: job.id },
      data: { finalCost: finalCostRupees },
    });

    // 3. Add ONE service line item if there's a service charge
    let serviceSubtotalPaisa = 0;
    let serviceTaxPaisa = 0;

    if (serviceChargePaisa > 0) {
      // Find or create "Repair Service" product (standard SERVICE type)
      let serviceProduct = await prisma.shopProduct.findFirst({
        where: { shopId: job.shopId, name: 'Repair Service', type: 'SERVICE' },
      });

      if (!serviceProduct) {
        serviceProduct = await prisma.shopProduct.create({
          data: {
            tenantId: job.tenantId,
            shopId: job.shopId,
            name: 'Repair Service',
            type: 'SERVICE',
            salePrice: 0, // Dynamic pricing
            gstRate: 18, // Default service tax rate
            hsnCode: '9987', // SAC for repair services
            isActive: true,
          },
        });
      }

      const serviceGstRate = isGstApplicable ? serviceProduct.gstRate || 18 : 0;

      // If serviceChargePaisa is GST-inclusive, extract base
      // Assume serviceChargePaisa is the final amount to customer
      // Back-calculate: base = total / (1 + gstRate/100)
      const divisor = 1 + serviceGstRate / 100;
      serviceSubtotalPaisa = Math.round(serviceChargePaisa / divisor);
      serviceTaxPaisa = serviceChargePaisa - serviceSubtotalPaisa;

      const serviceRateRupees = Math.round(serviceSubtotalPaisa / 100); // Convert to integer rupees

      itemsData.push({
        shopProductId: serviceProduct.id,
        quantity: 1,
        rate: serviceRateRupees, // Store as integer rupees (matches sales.service.ts convention)
        hsnCode: serviceProduct.hsnCode || '9987',
        gstRate: serviceGstRate,
        gstAmount: serviceTaxPaisa,
        lineTotal: serviceChargePaisa, // Total including GST
        costPrice: 0, // Services have zero direct product cost
      });
    }

    // 4. Calculate invoice-level totals
    const invoiceSubtotalPaisa = partsSubtotalPaisa + serviceSubtotalPaisa;
    const invoiceTaxPaisa = partsTaxPaisa + serviceTaxPaisa;
    const invoiceGrandTotalPaisa = invoiceSubtotalPaisa + invoiceTaxPaisa;

    // 5. Create Invoice via BillingService
    const invoice = await this.billingService.createInvoice(
      {
        tenantId: job.tenantId,
        shopId: job.shopId,
        customerId: job.customerId,
        customerName: job.customerName || 'Walk-in Customer',
        customerPhone: job.customerPhone,
        items: itemsData.map((item) => ({
          shopProductId: item.shopProductId,
          quantity: item.quantity,
          rate: item.rate,
          gstRate: item.gstRate,
          hsnCode: item.hsnCode,
          costPrice: item.costPrice, // Pass the captured cost price (Paise)
          isSerialized: false, // Mobile repairs parts are usually bulk here, or specific IMEI logic handled elsewhere if needed
        })),
        paymentMode: PaymentMode.CASH, // Default draft payment mode
        referenceType: 'JOB',
        referenceId: job.id,
        skipStockUpdate: true, // IMPORTANT: We already deducted stock in addPart!
        shop,
      },
      tx,
    );

    console.log(
      `✅ Auto-invoice ${invoice.invoiceNumber} created for Job ${job.jobNumber}`,
    );

    // 4. 🛡️ LINK ADVANCE RECEIPTS & UPDATE BALANCE
    // Fetch all advances linked to this JobCard
    const advanceReceipts = await prisma.receipt.findMany({
      where: {
        linkedJobCardId: job.id,
        receiptType: 'JOB_ADVANCE', // Type remains JOB_ADVANCE in Receipt model
        status: 'ACTIVE',
      },
    });

    if (advanceReceipts.length > 0) {
      const totalAdvancePaisa = advanceReceipts.reduce(
        (sum, r) => sum + r.amount,
        0,
      );

      // Link receipts to this new invoice
      await prisma.receipt.updateMany({
        where: {
          linkedJobCardId: job.id,
          receiptType: 'JOB_ADVANCE',
        },
        data: {
          linkedInvoiceId: invoice.id,
        },
      });

      // Check if fully paid by advance
      if (totalAdvancePaisa >= invoiceGrandTotalPaisa) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: InvoiceStatus.PAID,
            paymentMode: 'CASH', // Default or derived?
          },
        });
      }
    }

    console.log(
      `✅ Auto-created DRAFT/PAID invoice ${invoice.invoiceNumber} (${invoiceType}) for job ${job.jobNumber}`,
    );
  }

  /**
   * 🚫 INVOICE VOIDING
   */
  private async handleJobTermination(job: any, reason: JobStatus, tx?: any) {
    const prisma = tx || this.prisma;
    const invoices = await prisma.invoice.findMany({
      where: {
        jobCardId: job.id,
        status: { notIn: [InvoiceStatus.VOIDED] },
      },
    });

    for (const invoice of invoices) {
      if (
        invoice.status === InvoiceStatus.PAID ||
        invoice.status === InvoiceStatus.PARTIALLY_PAID
      ) {
        // [Risk F-03] Avoid voiding paid invoices without explicit refund flow
        throw new BadRequestException(
          `Cannot automatically void invoice ${invoice.invoiceNumber}. The invoice has payments against it. Please reconcile or refund the invoice explicitly before terminating this job.`,
        );
      }

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.VOIDED,
          voidReason: `Job Card status changed to ${reason}`,
          voidedAt: new Date(),
        },
      });

      // Also unlink advance receipts if any
      await prisma.receipt.updateMany({
        where: { linkedInvoiceId: invoice.id },
        data: { linkedInvoiceId: null },
      });

      console.log(
        `🗑️ VOIDED invoice ${invoice.invoiceNumber} for ${reason} job`,
      );
    }
  }

  async publicStatus(publicToken: string) {
    return this.prisma.jobCard.findUnique({
      where: { publicToken },
      select: {
        jobNumber: true,
        status: true,
        deviceBrand: true,
        deviceModel: true,
        deviceType: true,
        estimatedDelivery: true,
        updatedAt: true,
        shop: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  /**
   * 💰 UPDATE SERVICE CHARGE (with GST recalculation)
   * Only allowed when JobCard status is READY
   * Recalculates invoice totals automatically
   */
  async updateServiceCharge(
    user: any,
    shopId: string,
    jobId: string,
    newServiceChargePaisa: number,
  ) {
    await this.assertAccess(user, shopId);

    const job = await this.prisma.jobCard.findUnique({
      where: { id: jobId, shopId },
      include: { invoices: true, parts: { include: { product: true } } },
    });

    if (!job) throw new NotFoundException('Job not found');

    // 🛡️ GUARD: Service charge edits only allowed between READY and DELIVERY
    if (job.status === 'DELIVERED') {
      throw new BadRequestException(
        'Cannot edit service charge after delivery. Use credit note for corrections.',
      );
    }

    if (job.status !== 'READY') {
      throw new BadRequestException(
        'Service charge can only be edited after marking job READY',
      );
    }

    // Find the non-voided invoice
    const invoice = job.invoices.find((i) => i.status !== InvoiceStatus.VOIDED);
    if (!invoice) {
      throw new BadRequestException('No invoice found for this job');
    }

    // Get shop GST settings
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { repairGstDefault: true },
    });

    const isGstApplicable =
      invoice.isGstApplicable && (shop?.repairGstDefault ?? false);
    const gstRate = isGstApplicable ? 18 : 0; // Service GST rate for repairs

    // Calculate service GST
    let newServiceSubtotalPaisa = newServiceChargePaisa;
    let newServiceGstPaisa = 0;

    if (isGstApplicable && gstRate > 0) {
      const divisor = 1 + gstRate / 100;
      newServiceSubtotalPaisa = Math.round(newServiceChargePaisa / divisor);
      newServiceGstPaisa = newServiceChargePaisa - newServiceSubtotalPaisa;
    }

    return this.prisma.$transaction(async (tx) => {
      // Find the "Repair Service" item in the invoice
      const serviceItem = await tx.invoiceItem.findFirst({
        where: {
          invoiceId: invoice.id,
          product: { name: 'Repair Service' },
        },
        include: { product: true },
      });

      if (!serviceItem) {
        throw new BadRequestException('Service line item not found in invoice');
      }

      // Update the service line item
      await tx.invoiceItem.update({
        where: { id: serviceItem.id },
        data: {
          rate: Math.round(newServiceSubtotalPaisa / 100), // Store as integer rupees
          gstAmount: newServiceGstPaisa,
          lineTotal: newServiceChargePaisa,
        },
      });

      // Recalculate invoice totals (sum all items)
      const allItems = await tx.invoiceItem.findMany({
        where: { invoiceId: invoice.id },
      });

      let newSubtotal = 0;
      let newGstTotal = 0;
      for (const item of allItems) {
        newSubtotal += item.rate * item.quantity * 100; // rate is in rupees, convert to paisa
        newGstTotal += item.gstAmount;
      }

      const newTotal = newSubtotal + newGstTotal;

      // Update invoice totals
      return await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          subTotal: newSubtotal,
          gstAmount: newGstTotal,
          totalAmount: newTotal,
        },
      });
    });
  }

  /**
   * 🔍 INFER CANCEL STAGE (without DB field)
   * Determines when the job was cancelled relative to READY/DELIVERY
   * Returns: 'BEFORE_READY' | 'AFTER_READY' | 'AFTER_DELIVERY' | null
   */
  private async inferCancelStage(
    job: any,
  ): Promise<'BEFORE_READY' | 'AFTER_READY' | 'AFTER_DELIVERY' | null> {
    if (job.status !== 'CANCELLED') return null;

    // Check if any invoice exists (even voided = means it reached READY stage)
    const invoices = await this.prisma.invoice.findMany({
      where: { jobCardId: job.id },
    });

    // Check if any payment exists
    const payments = await this.prisma.receipt.findMany({
      where: { linkedInvoiceId: { in: invoices.map((i) => i.id) } },
    });

    // If invoices exist, job was READY (since invoice created at READY)
    // If payments exist, job reached invoice stage
    if (invoices.length === 0) {
      return 'BEFORE_READY'; // No invoice = never reached READY
    }

    if (payments.length > 0) {
      return 'AFTER_DELIVERY'; // Payment collected = delivered (not reopenable)
    }

    // If invoice exists but no payment, job was cancelled after READY but before/at delivery
    const hasDeliveredInvoice = invoices.some(
      (i) => i.status === InvoiceStatus.PAID,
    );
    if (hasDeliveredInvoice) {
      return 'AFTER_DELIVERY'; // Invoice was paid = delivered
    }

    return 'AFTER_READY'; // Invoice exists but not paid/delivered = after READY but before delivery
  }

  /**
   * 🔓 REOPEN CANCELLED JOB
   * Safely reopens cancelled jobs based on cancellation stage
   * CASE 1: Before READY → Reopen to IN_PROGRESS (safe, no invoice)
   * CASE 2: After READY but before DELIVERY → Reopen to IN_PROGRESS (old invoice voided, new one on next READY)
   * CASE 3: After DELIVERY → ❌ NOT ALLOWED
   */
  async reopen(user: any, shopId: string, jobId: string) {
    await this.assertAccess(user, shopId);

    const job = await this.prisma.jobCard.findUnique({
      where: { id: jobId, shopId },
      include: {
        invoices: true,
        parts: true,
      },
    });

    if (!job) throw new NotFoundException('Job not found');

    // 🛡️ GUARD: Only cancelled jobs can be reopened
    if (job.status !== 'CANCELLED') {
      throw new BadRequestException(
        `Only cancelled jobs can be reopened. This job is currently ${job.status}.`,
      );
    }

    // Determine cancellation stage
    const cancelStage = await this.inferCancelStage(job);

    // 🛡️ GUARD: Cannot reopen jobs cancelled after delivery
    if (cancelStage === 'AFTER_DELIVERY') {
      throw new BadRequestException(
        'This job was delivered and cannot be reopened. Create a new job or use credit note for changes.',
      );
    }

    // ✅ SAFE TO REOPEN
    // Restore job status to IN_PROGRESS
    const reopenedJob = await this.prisma.jobCard.update({
      where: { id: jobId },
      data: {
        status: 'IN_PROGRESS',
        // Track reopen in status history
        statusHistory: (job.statusHistory as any[]) || [],
      },
    });

    // Add reopen event to status history
    const statusHistory = (reopenedJob.statusHistory as any[]) || [];
    statusHistory.push({
      from: 'CANCELLED',
      to: 'IN_PROGRESS',
      timestamp: new Date().toISOString(),
      userId: user.sub,
      userName: user.name || user.email,
      reason: `Reopened (was cancelled at stage: ${cancelStage})`,
    });

    // Update with history
    const finalJob = await this.prisma.jobCard.update({
      where: { id: jobId },
      data: { statusHistory },
    });

    console.log(
      `♻️ Reopened job ${job.jobNumber} (cancelled at ${cancelStage} stage)`,
    );

    return finalJob;
  }

  /**
   * Record customer consent for non-refundable advance
   * Required before accepting payment or moving to READY status
   */
  async recordConsent(
    user: any,
    shopId: string,
    jobId: string,
    consentNonRefundable: boolean,
    consentSignatureUrl?: string,
  ) {
    await this.assertAccess(user, shopId);

    const job = await this.prisma.jobCard.findFirst({
      where: { id: jobId, tenantId: user.tenantId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.tenantId !== user.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    // Cannot modify consent on delivered/cancelled jobs
    if (['DELIVERED', 'CANCELLED'].includes(job.status)) {
      throw new BadRequestException('Cannot modify consent on completed job');
    }

    // Record consent
    const updatedJob = await this.prisma.jobCard.update({
      where: { id: jobId },
      data: {
        consentNonRefundable,
        consentAt: new Date(),
        ...(consentSignatureUrl && { consentSignatureUrl }),
      },
    });

    console.log(
      `✅ Recorded consent for job ${job.jobNumber}: nonRefundable=${consentNonRefundable}`,
    );

    return updatedJob;
  }

  async delete(user: any, shopId: string, id: string) {
    await this.assertAccess(user, shopId);

    // SECURITY FIX: Use tenantId filter to prevent cross-tenant deletion
    const job = await this.prisma.jobCard.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    if (['DELIVERED', 'CANCELLED'].includes(job.status)) {
      throw new BadRequestException('Cannot delete locked job');
    }

    // SECURITY FIX: Verify tenant ownership before deletion
    return this.prisma.jobCard.delete({
      where: { id },
    });
  }
}
