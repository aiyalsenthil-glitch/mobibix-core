import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import * as crypto from 'crypto';
import { CreateJobCardDto } from '../jobcard/dto/create-job-card.dto';
import {
  JobStatus,
  InvoiceStatus,
  Prisma,
  DocumentType,
  InvoiceType,
  RepairInvoiceNumberingMode,
  StockEntryType,
  StockRefType,
  ProductType,
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

@Injectable()
export class JobCardsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private statusValidator: JobStatusValidator,
    private documentNumberService: DocumentNumberService,
    private stockService: StockService,
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

  /**
   * 🛒 ADD PART TO JOB CARD
   * - Deducts stock immediately
   * - Snapshots cost price
   */
  async addPart(user, shopId: string, jobId: string, dto: { productId: string; quantity: number }) {
    await this.assertAccess(user, shopId);

    const job = await this.prisma.jobCard.findUnique({
      where: { id: jobId, shopId },
    });

    if (!job) throw new NotFoundException('Job card not found');

    if (['DELIVERED', 'CANCELLED', 'RETURNED'].includes(job.status)) {
       throw new BadRequestException('Cannot add parts to closed job');
    }

    const product = await this.prisma.shopProduct.findUnique({
      where: { id: dto.productId, shopId },
    });

    if (!product) throw new NotFoundException('Product not found');

    // 🛡️ BUSINESS RULE: SERVICE products cannot be added as parts
    // Services are billed separately, never tracked in inventory
    if (product.type === ProductType.SERVICE) {
      throw new BadRequestException(
        `"${product.name}" is a service item and cannot be added as a repair part. Services are billed separately.`
      );
    }

    // Use transaction to ensure stock deduction happens with part usage
    return this.prisma.$transaction(async (tx) => {
       // 1. Upsert JobCardPart (accumulate quantity if already exists)
       const existing = await tx.jobCardPart.findUnique({
          where: { jobCardId_shopProductId: { jobCardId: jobId, shopProductId: dto.productId } }
       });

       const newQty = (existing?.quantity || 0) + dto.quantity;
       const costSnapshot = product.avgCost || product.costPrice || 0;

       if (existing) {
          await tx.jobCardPart.update({
             where: { id: existing.id },
             data: { quantity: newQty }
          });
       } else {
          await tx.jobCardPart.create({
             data: {
                jobCardId: jobId,
                shopProductId: dto.productId,
                quantity: dto.quantity,
                costPrice: costSnapshot
             }
          });
       }

       // 2. Deduct Stock via StockService (enforces availability, IMEI validation, etc.)
       // This ensures all stock rules are applied consistently across the system
       await this.stockService.recordStockOut(
         user.tenantId,
         shopId,
         dto.productId,
         dto.quantity,
         'REPAIR',
         jobId,
         costSnapshot,
         undefined, // IMEIs handled by StockService internally
         tx
       );
       
       return { success: true };
    });
  }

  /**
   * 🗑️ REMOVE PART FROM JOB CARD
   * - Restores stock
   */
  async removePart(user, shopId: string, jobId: string, partId: string) {
     await this.assertAccess(user, shopId);
     
     const job = await this.prisma.jobCard.findUnique({ where: { id: jobId, shopId } });
     if (!job) throw new NotFoundException('Job not found');
     
     if (['DELIVERED', 'CANCELLED'].includes(job.status)) {
        throw new BadRequestException('Cannot modify closed job');
     }

     return this.prisma.$transaction(async (tx) => {
        const part = await tx.jobCardPart.findUnique({
           where: { id: partId },
           include: { product: true }
        });
        
        if (!part) throw new NotFoundException('Part not found');

        // Restore Stock via StockService (consistent with addPart)
        if (part.product.type !== ProductType.SERVICE) {
           await this.stockService.recordStockIn(
             user.tenantId,
             shopId,
             part.shopProductId,
             part.quantity,
             'REPAIR',
             jobId,
             part.costPrice ?? undefined,
             undefined, // IMEIs
             tx
           );
        }
        
        // Delete usage record
        await tx.jobCardPart.delete({ where: { id: partId } });
        
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
           include: { product: true }
        }
      },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    // 💰 PROFIT CALCULATION (Owner Only)
    if (user.role === 'OWNER') {
       const jobPartsCostPaisa = job.parts.reduce((sum, part) => sum + (part.quantity * (part.costPrice || 0)), 0);
       const jobPartsCostRupees = jobPartsCostPaisa / 100;
       
       // Revenue comes from Invoice (excluding tax).
       const revenuePaisa = job.invoices
         .filter(i => i.status !== InvoiceStatus.VOIDED)
         .reduce((sum, i) => sum + i.subTotal, 0);
       
       const revenueRupees = revenuePaisa / 100;
       const profit = revenueRupees - jobPartsCostRupees;
       
       return {
          ...job,
          jobCost: jobPartsCostRupees, // Return Rupees
          profit: profit,
          revenue: revenueRupees
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
      include: {
        invoices: true,
        parts: user.role === 'OWNER' ? { include: { product: true } } : false // Only fetch parts logic for owner if needed for list view?
        // Optimization: List view might not need parts details unless showing profit column.
        // Assuming list view needs basic info. 
      },
    });
    
    // If Owner, map to include profit?
    if (user.role === 'OWNER') {
       // This might be expensive for list. 
       // But required? "Profit visible to OWNER only". implicit in details. 
       // User didn't strictly say "In list view". 
       // I'll skip profit in list for performance unless requested.
    }

    return { jobCards, empty: false };
  }

  /**
   * 🎯 UPDATE JOB STATUS
   */
  async updateStatus(user, shopId: string, id: string, newStatus: JobStatus) {
    await this.assertAccess(user, shopId);
    
    // 1️⃣ Fetch job with invoices
    const job = await this.prisma.jobCard.findUnique({
      where: { id },
      include: { invoices: true, parts: { include: { product: true } } },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    // 2️⃣ Validate state transition (throws if invalid)
    this.statusValidator.validateTransition(job.status, newStatus);

    // 3️⃣ Handle status-specific business logic
    if (newStatus === 'READY') {
      // 🚨 CRITICAL VALIDATION: Cannot mark READY without cost
      if (!job.finalCost && !job.estimatedCost) {
         throw new BadRequestException(
           'Cannot mark job READY without cost. Please add Final Cost or Estimated Cost first.'
         );
      }
    }
    
    // 🛑 DELIVERY GUARD
    if (newStatus === 'DELIVERED') {
       const validInvoice = job.invoices.find(i => i.status !== InvoiceStatus.VOIDED);
       
       if (!validInvoice) {
          throw new BadRequestException('Cannot deliver job without an invoice. Status must be READY first.');
       }
       
       if (validInvoice.status !== InvoiceStatus.FINAL && validInvoice.status !== InvoiceStatus.PAID && validInvoice.status !== InvoiceStatus.CREDIT) {
          // Note: PAID and CREDIT are roughly equivalent to FINAL in business logic (locked).
          // But status enum has DRAFT, FINAL, PAID, CREDIT.
          // Guards: "Block DELIVERED if invoice not FINAL". 
          // Assuming FINAL is the state before payment or credit. 
          // However, if it's PAID, it is Final.
          // Let's be permissive check: Must NOT be DRAFT.
          if (validInvoice.status === InvoiceStatus.DRAFT) {
             throw new BadRequestException('Cannot deliver job. Invoice is still DRAFT. Finalize invoice first.');
          }
       }
    }

    if (this.statusValidator.shouldCreateInvoice(newStatus)) {
      await this.handleJobReady(job, user); // Pass user for tenantId context if needed
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

    // 5️⃣ Emit WhatsApp event
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
   * POPULATES ITEMS from JobCardParts + Service Charge
   */
  private async handleJobReady(job: any, user?: any) {
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

    // Get shop options
    const shop = await this.prisma.shop.findUnique({
      where: { id: job.shopId },
      select: {
        invoicePrefix: true,
        repairInvoiceNumberingMode: true,
        repairGstDefault: true,
      },
    });

    if (!shop) throw new BadRequestException('Shop not found');

    // Numbering Mode Logic
    const numberingMode =
      shop.repairInvoiceNumberingMode || RepairInvoiceNumberingMode.SHARED;
    const isSeparate = numberingMode === RepairInvoiceNumberingMode.SEPARATE;

    const docType = isSeparate
      ? DocumentType.REPAIR_INVOICE
      : DocumentType.SALES_INVOICE;

    const invoiceType = InvoiceType.REPAIR;
    // GST Logic: Respect Bill Type. If WITHOUT_GST, force false. Else default to shop settings.
    const isGstApplicable = job.billType === 'WITHOUT_GST' ? false : (shop.repairGstDefault ?? false);

    // Generate Document Number
    const invoiceNumber =
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
          const quantityNum = part.quantity;
          const gstRatePercent = isGstApplicable ? (part.product.gstRate || 0) : 0;
          
          // Calculate GST-inclusive line total
          const lineSubtotalPaisa = ratePaisa * quantityNum;
          const lineTaxPaisa = Math.round((lineSubtotalPaisa * gstRatePercent) / 100);
          const lineTotalPaisa = lineSubtotalPaisa + lineTaxPaisa;
          
          itemsData.push({
             shopProductId: part.shopProductId,
             quantity: quantityNum,
             rate: ratePaisa, 
             hsnCode: part.product.hsnCode || '9987', 
             gstRate: gstRatePercent,
             gstAmount: lineTaxPaisa,
             lineTotal: lineTotalPaisa
          });
          
          partsSubtotalPaisa += lineSubtotalPaisa;
          partsTaxPaisa += lineTaxPaisa;
       }
    }
    
    // 2. Calculate Service Charge (difference between job cost and parts)
    // Service charge = What customer pays - Cost of parts used
    const targetTotalPaisa = (job.finalCost || job.estimatedCost || 0) * 100; // Convert to Paisa
    const partsWithTaxPaisa = partsSubtotalPaisa + partsTaxPaisa;
    const serviceChargePaisa = Math.max(0, targetTotalPaisa - partsWithTaxPaisa); // Never negative
    
    // 3. Add ONE service line item if there's a service charge
    let serviceSubtotalPaisa = 0;
    let serviceTaxPaisa = 0;
    
    if (serviceChargePaisa > 0) {
       // Find or create "Repair Service" product (standard SERVICE type)
       let serviceProduct = await this.prisma.shopProduct.findFirst({
         where: { shopId: job.shopId, name: 'Repair Service', type: 'SERVICE' }
       });

       if (!serviceProduct) {
         serviceProduct = await this.prisma.shopProduct.create({
           data: {
             tenantId: job.tenantId,
             shopId: job.shopId,
             name: 'Repair Service',
             type: 'SERVICE',
             salePrice: 0, // Dynamic pricing
             gstRate: 18, // Default service tax rate
             hsnCode: '9987', // SAC for repair services
             isActive: true
           }
         });
       }

       const serviceGstRate = isGstApplicable ? (serviceProduct.gstRate || 18) : 0;
       
       // If serviceChargePaisa is GST-inclusive, extract base
       // Assume serviceChargePaisa is the final amount to customer
       // Back-calculate: base = total / (1 + gstRate/100)
       const divisor = 1 + (serviceGstRate / 100);
       serviceSubtotalPaisa = Math.round(serviceChargePaisa / divisor);
       serviceTaxPaisa = serviceChargePaisa - serviceSubtotalPaisa;

       itemsData.push({
          shopProductId: serviceProduct.id,
          quantity: 1,
          rate: serviceSubtotalPaisa, // Base service charge
          hsnCode: serviceProduct.hsnCode || '9987',
          gstRate: serviceGstRate,
          gstAmount: serviceTaxPaisa,
          lineTotal: serviceChargePaisa // Total including GST
       });
    }
    
    // 4. Calculate invoice-level totals
    const invoiceSubtotalPaisa = partsSubtotalPaisa + serviceSubtotalPaisa;
    const invoiceTaxPaisa = partsTaxPaisa + serviceTaxPaisa;
    const invoiceGrandTotalPaisa = invoiceSubtotalPaisa + invoiceTaxPaisa;

    const fy = getFinancialYear(new Date());

    // Create DRAFT invoice with correct totals
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
        subTotal: invoiceSubtotalPaisa, 
        gstAmount: invoiceTaxPaisa,
        totalAmount: invoiceGrandTotalPaisa,
        paymentMode: 'CASH',
        cashAmount: 0,
        invoiceType,
        isGstApplicable,
        items: {
           create: itemsData
        }
      },
    });

    console.log(
      `✅ Auto-created DRAFT invoice ${invoice.invoiceNumber} (${invoiceType}) for job ${job.jobNumber}`,
    );
  }

  /**
   * 🚫 INVOICE VOIDING
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
