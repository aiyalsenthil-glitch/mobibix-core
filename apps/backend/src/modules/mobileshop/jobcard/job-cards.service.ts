import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import * as crypto from 'crypto';
import { CreateJobCardDto } from '../jobcard/dto/create-job-card.dto';
import { JobStatus, InvoiceStatus, Prisma, DocumentType } from '@prisma/client';
import { UpdateJobCardDto } from '../jobcard/dto/update-job-card.dto';
import {
  generateJobCardNumber,
  getFinancialYear,
} from '../../../common/utils/invoice-number.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobStatusChangedEvent } from '../../../core/events/crm.events';
import { JobStatusValidator } from './job-status-validator.service';
import { DocumentNumberService } from 'src/common/services/document-number.service';

@Injectable()
export class JobCardsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private statusValidator: JobStatusValidator,
    private documentNumberService: DocumentNumberService,
  ) {}

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

    return this.prisma.jobCard.create({
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
        advancePaid: dto.advancePaid,
        billType: dto.billType ?? 'WITHOUT_GST',
        estimatedDelivery: dto.estimatedDelivery
          ? new Date(dto.estimatedDelivery)
          : null,
      },
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
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    return job;
  }
  async update(user: any, shopId: string, id: string, dto: UpdateJobCardDto) {
    await this.assertAccess(user, shopId);

    const job = await this.prisma.jobCard.findFirst({
      where: { id, shopId, tenantId: user.tenantId },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    if (['DELIVERED', 'CANCELLED'].includes(job.status)) {
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
    if (dto.billType !== undefined) data.billType = dto.billType;
    if (dto.estimatedDelivery !== undefined)
      data.estimatedDelivery = dto.estimatedDelivery
        ? new Date(dto.estimatedDelivery)
        : null;

    return this.prisma.jobCard.update({
      where: { id },
      data,
    });
  }

  async list(user, shopId: string) {
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

    const jobCards = await this.prisma.jobCard.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
    });

    return { jobCards, empty: false };
  }

  /**
   * 🎯 UPDATE JOB STATUS with full lifecycle automation
   * - Validates state transitions
   * - Auto-creates DRAFT invoice on READY
   * - Voids invoice on CANCELLED/RETURNED
   * - Logs status history
   * - Triggers WhatsApp only for customer-facing statuses
   */
  async updateStatus(user, shopId: string, id: string, newStatus: JobStatus) {
    await this.assertAccess(user, shopId);
    
    // 1️⃣ Fetch job with invoices
    const job = await this.prisma.jobCard.findUnique({
      where: { id },
      include: { invoices: true },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    // 2️⃣ Validate state transition (throws if invalid)
    this.statusValidator.validateTransition(job.status, newStatus);

    // 3️⃣ Handle status-specific business logic
    if (newStatus === 'READY') {
      // 🚨 CRITICAL VALIDATION: Cannot mark READY without cost
      // This ensures invoice creation never fails silently
      if (!job.finalCost && !job.estimatedCost) {
         throw new BadRequestException(
           'Cannot mark job READY without cost. Please add Final Cost or Estimated Cost first.'
         );
      }
    }

    if (this.statusValidator.shouldCreateInvoice(newStatus)) {
      await this.handleJobReady(job);
    } else if (this.statusValidator.shouldVoidInvoice(newStatus)) {
      await this.handleJobTermination(job, newStatus);
    }

    // 4️⃣ Update status with history tracking
    const statusHistory = (job.statusHistory as any[]) || [];
    statusHistory.push({
      from: job.status,
      to: newStatus,
      timestamp: new Date().toISOString(),
      userId: user.sub,
      userName: user.name || user.email,
    });

    const updatedJob = await this.prisma.jobCard.update({
      where: { id },
      data: {
        status: newStatus,
        statusHistory,
      },
    });

    // 5️⃣ Emit WhatsApp event ONLY for customer-facing statuses (READY, DELIVERED, CANCELLED)
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

    return updatedJob;
  }

  /**
   * 🚀 AUTO-INVOICE CREATION
   * Triggered when job status becomes READY
   * Creates exactly ONE DRAFT invoice (editable)
   */
  private async handleJobReady(job: any) {
    // Prevent duplicate creation
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: {
        jobCardId: job.id,
        status: { not: InvoiceStatus.VOIDED },
      },
    });

    if (existingInvoice) {
      console.log(`⚠️ Job ${job.jobNumber} already has invoice, skipping auto-creation`);
      return;
    }

    // Validate job has cost
    if (!job.finalCost && !job.estimatedCost) {
      console.warn(`⚠️ Job ${job.jobNumber} marked READY but has no cost estimate`);
      return; // Don't block - invoice can be created manually
    }

    // Get shop for prefix
    const shop = await this.prisma.shop.findUnique({
      where: { id: job.shopId },
      select: { invoicePrefix: true },
    });

    if (!shop) throw new BadRequestException('Shop not found');

    // Generate Document Number via Service
    const invoiceNumber =
      await this.documentNumberService.generateDocumentNumber(
        job.shopId,
        DocumentType.SALES_INVOICE,
        new Date(),
      );

    // Calculate totals in Paisa (Database uses Integer Paisa)
    // Job costs are Float Rupees -> Convert to Paisa (* 100)
    const subTotalPaisa = Math.round((job.finalCost || job.estimatedCost || 0) * 100);
    const totalAmountPaisa = subTotalPaisa; // Assuming no tax for simple auto-invoice for now, or 0 tax

    const fy = getFinancialYear(new Date());

    // Create DRAFT invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId: job.tenantId,
        shopId: job.shopId,
        jobCardId: job.id,
        customerId: job.customerId,
        invoiceNumber,
        invoiceDate: new Date(),
        financialYear: fy,
        customerName: job.customerName,
        customerPhone: job.customerPhone,
        status: InvoiceStatus.DRAFT,
        subTotal: subTotalPaisa,
        gstAmount: 0,
        totalAmount: totalAmountPaisa,
        paymentMode: 'CASH',
        cashAmount: 0,
      },
    });

    console.log(`✅ Auto-created DRAFT invoice ${invoice.invoiceNumber} for job ${job.jobNumber}`);
  }

  /**
   * 🚫 INVOICE VOIDING
   * Triggered when job is CANCELLED or RETURNED
   * Voids all non-paid invoices
   */
  private async handleJobTermination(job: any, reason: JobStatus) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        jobCardId: job.id,
        status: { notIn: [InvoiceStatus.VOIDED, InvoiceStatus.PAID] },
      },
    });

    for (const invoice of invoices) {
      if (invoice.status === InvoiceStatus.PAID) {
        throw new BadRequestException(
          `Cannot ${reason.toLowerCase()} job: Invoice ${invoice.invoiceNumber} is paid. Refund required.`
        );
      }

      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.VOIDED,
          voidReason: `Job ${reason.toLowerCase()}`,
          voidedAt: new Date(),
        },
      });

      console.log(`🗑️ VOIDED invoice ${invoice.invoiceNumber} for ${reason} job`);
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
        estimatedDelivery: true,
        updatedAt: true,
      },
    });
  }

  async delete(user: any, shopId: string, id: string) {
    await this.assertAccess(user, shopId);

    const job = await this.prisma.jobCard.findUnique({ where: { id } });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    if (['DELIVERED', 'CANCELLED'].includes(job.status)) {
      throw new BadRequestException('Cannot delete locked job');
    }

    return this.prisma.jobCard.delete({ where: { id } });
  }
}
