import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DocumentNumberService } from '../../../common/services/document-number.service';
import { SalesService } from '../../../core/sales/sales.service';
import { JobCardsService } from '../jobcard/job-cards.service';
import { CreateQuotationDto, CreateQuotationItemDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { ConvertQuotationDto, QuotationConversionType } from './dto/convert-quotation.dto';
import { DocumentType, QuotationStatus, ModuleType, UserRole, FollowUpType } from '@prisma/client';
import { normalizePhone } from '../../../common/utils/phone.util';
import { FollowUpsService } from '../../../core/follow-ups/follow-ups.service';

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);

  constructor(
    private prisma: PrismaService,
    private docNumberService: DocumentNumberService,
    private salesService: SalesService,
    private jobCardsService: JobCardsService,
    private followUpsService: FollowUpsService,
  ) {}
  
  private toPaisa(amount: number): number {
    return Math.round(amount * 100);
  }

  private fromPaisa(amount: number): number {
    return amount / 100;
  }

  private mapQuotation(quotation: any) {
    return {
      ...quotation,
      subTotal: this.fromPaisa(quotation.subTotal),
      gstAmount: this.fromPaisa(quotation.gstAmount),
      totalAmount: this.fromPaisa(quotation.totalAmount),
      items: quotation.items?.map((item: any) => ({
        ...item,
        price: this.fromPaisa(item.price),
        gstAmount: this.fromPaisa(item.gstAmount),
        lineTotal: this.fromPaisa(item.lineTotal),
        totalAmount: this.fromPaisa(item.totalAmount),
      })),
    };
  }

  async listQuotations(tenantId: string, shopId: string, params?: any) {
    const { status, search, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      shopId,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { quotationNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return {
      data: items.map(item => this.mapQuotation(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getQuotation(tenantId: string, shopId: string, id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, tenantId, shopId },
      include: { 
        items: { 
          include: { 
            product: {
              select: {
                id: true,
                name: true,
                salePrice: true,
                hsnCode: true,
                gstRate: true,
              }
            } 
          } 
        } 
      },
    });


    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    return this.mapQuotation(quotation);
  }

  async createQuotation(tenantId: string, shopId: string, dto: CreateQuotationDto, user: any) {
    return this.prisma.$transaction(async (tx) => {
      // 0. Find or create customer (Treat as Lead)
      let customerId = dto.customerId;
      let customerName = dto.customerName;
      let customerPhone = dto.customerPhone;

      if (!customerId && customerPhone) {
        const normalized = normalizePhone(customerPhone);
        const existing = await tx.party.findFirst({
          where: { 
            tenantId, 
            OR: [
              { phone: customerPhone },
              { normalizedPhone: normalized }
            ],
            partyType: { in: ['CUSTOMER', 'BOTH'] }
          }
        });

        if (existing) {
          customerId = existing.id;
          customerName = existing.name; // Use existing name if found
        } else {
          // Create Lead
          const newPath = await tx.party.create({
            data: {
              tenantId,
              name: customerName,
              phone: customerPhone,
              normalizedPhone: normalized,
              partyType: 'CUSTOMER',
              isActive: true,
              tags: ['Lead'],
            }
          });
          customerId = newPath.id;
        }
      }

      // 1. Generate quotation number
      const quotationNumber = await this.docNumberService.generateDocumentNumber(
        shopId,
        DocumentType.QUOTATION,
        dto.quotationDate ? new Date(dto.quotationDate) : new Date(),
        tx,
      );

      // 2. Calculate totals
      let subTotal = 0;
      let gstAmount = 0;

      const itemsData = dto.items.map((item) => {
        const gstRate = item.gstRate || 0;
        let pricePaisa: number;
        if (dto.taxInclusive && gstRate > 0) {
          // Back-calculate base price: basePrice = inclusivePrice / (1 + gstRate/100)
          pricePaisa = Math.round(this.toPaisa(item.price) / (1 + gstRate / 100));
        } else {
          pricePaisa = this.toPaisa(item.price);
        }
        const itemSubTotal = pricePaisa * item.quantity;
        const itemGstAmount = Math.round((itemSubTotal * gstRate) / 100);

        subTotal += itemSubTotal;
        gstAmount += itemGstAmount;

        return {
          shopProductId: item.shopProductId,
          description: item.description,
          quantity: item.quantity,
          price: pricePaisa,
          gstRate,
          gstAmount: itemGstAmount,
          lineTotal: itemSubTotal,
          totalAmount: itemSubTotal + itemGstAmount,
        };
      });

      const totalAmount = subTotal + gstAmount;

      // 3. Create quotation
      const quotation = await tx.quotation.create({
        data: {
          tenantId,
          shopId,
          quotationNumber,
          customerId,
          customerName,
          customerPhone,
          quotationDate: dto.quotationDate ? new Date(dto.quotationDate) : new Date(),
          subTotal,
          gstAmount,
          totalAmount,
          notes: dto.notes,
          status: QuotationStatus.DRAFT,
          validityDays: dto.validityDays || 7,
          expiryDate: this.calculateExpiryDate(dto.quotationDate || new Date(), dto.validityDays || 7),
          items: {
            create: itemsData,
          },
        },
        include: { items: true },
      });

      // 4. Create Follow-up Task (Lead Management)
      if (customerId) {
        try {
          // Schedule follow up 3 days from now
          const followUpAt = new Date();
          followUpAt.setDate(followUpAt.getDate() + 3);

          await this.followUpsService.createFollowUp(tenantId, user.sub, user.role, {
            customerId,
            shopId,
            type: FollowUpType.PHONE_CALL,
            purpose: `Quotation Follow-up: ${quotationNumber}`,
            note: `Follow up on quotation for ${customerName}. Total: ${this.fromPaisa(totalAmount)}`,
            followUpAt: followUpAt.toISOString(),
          });
        } catch (err) {
          this.logger.error(`Failed to create quotation follow-up: ${err.message}`);
        }
      }

      return this.mapQuotation(quotation);
    });
  }

  async updateQuotation(tenantId: string, shopId: string, id: string, dto: UpdateQuotationDto) {
    const existing = await this.getQuotation(tenantId, shopId, id);

    if (existing.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT quotations can be updated');
    }

    return this.prisma.$transaction(async (tx) => {
      // Handle customer linking if phone/id changed
      let customerId = dto.customerId || existing.customerId;
      let customerName = dto.customerName || existing.customerName;
      let customerPhone = dto.customerPhone || existing.customerPhone;

      if (dto.customerPhone && !dto.customerId && dto.customerPhone !== existing.customerPhone) {
        const normalized = normalizePhone(dto.customerPhone);
        const existingParty = await tx.party.findFirst({
          where: { 
            tenantId, 
            OR: [
              { phone: dto.customerPhone },
              { normalizedPhone: normalized }
            ],
            partyType: { in: ['CUSTOMER', 'BOTH'] }
          }
        });

        if (existingParty) {
          customerId = existingParty.id;
          customerName = existingParty.name;
        } else {
          // Create Lead
          const newPath = await tx.party.create({
            data: {
              tenantId,
              name: customerName,
              phone: dto.customerPhone,
              normalizedPhone: normalized,
              partyType: 'CUSTOMER',
              isActive: true,
              tags: ['Lead'],
            }
          });
          customerId = newPath.id;
        }
      }

      // 1. Handle items update if provided
      if (dto.items) {
        // ... (rest of logic remains same but using the resolved customerId)
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });

        let subTotal = 0;
        let gstAmount = 0;

        const itemsData = dto.items.map((item) => {
          const pricePaisa = this.toPaisa(item.price);
          const itemSubTotal = pricePaisa * item.quantity;
          const itemGstAmount = Math.round((itemSubTotal * (item.gstRate || 0)) / 100);
          
          subTotal += itemSubTotal;
          gstAmount += itemGstAmount;

          return {
            quotationId: id,
            shopProductId: item.shopProductId,
            description: item.description,
            quantity: item.quantity,
            price: pricePaisa,
            gstRate: item.gstRate || 0,
            gstAmount: itemGstAmount,
            lineTotal: itemSubTotal,
            totalAmount: itemSubTotal + itemGstAmount,
          };
        });

        const totalAmount = subTotal + gstAmount;

        const updated = await tx.quotation.update({
          where: { id },
          data: {
            customerName,
            customerPhone,
            customerId,
            validityDays: dto.validityDays,
            expiryDate: dto.validityDays ? this.calculateExpiryDate(existing.quotationDate, dto.validityDays) : undefined,
            notes: dto.notes,
            subTotal,
            gstAmount,
            totalAmount,
            items: {
              create: itemsData,
            },
          },
          include: { items: true },
        });
        return this.mapQuotation(updated);
      }

      // 2. Simple update without items
      const updated = await tx.quotation.update({
        where: { id },
        data: {
          customerName,
          customerPhone,
          customerId,
          validityDays: dto.validityDays,
          expiryDate: dto.validityDays ? this.calculateExpiryDate(existing.quotationDate, dto.validityDays) : undefined,
          notes: dto.notes,
        },
        include: { items: true },
      });
      return this.mapQuotation(updated);
    });
  }

  async updateStatus(tenantId: string, shopId: string, id: string, status: QuotationStatus) {
    const existing = await this.getQuotation(tenantId, shopId, id);

    if (existing.status === QuotationStatus.CONVERTED) {
      throw new BadRequestException('Cannot change status of a converted quotation');
    }

    return this.prisma.quotation.update({
      where: { id },
      data: { status },
    });
  }

  async convertQuotation(tenantId: string, shopId: string, id: string, dto: ConvertQuotationDto, user: any) {
    const quotation = await this.getQuotation(tenantId, shopId, id);

    if (quotation.status !== QuotationStatus.ACCEPTED && quotation.status !== QuotationStatus.SENT) {
      if (quotation.status === QuotationStatus.CONVERTED) {
        throw new BadRequestException('Quotation is already converted');
      }
      throw new BadRequestException('Only ACCEPTED or SENT quotations can be converted');
    }

    if (dto.conversionType === QuotationConversionType.INVOICE) {
      return this.convertToInvoice(tenantId, shopId, quotation, user);
    } else {
      return this.convertToJobCard(tenantId, shopId, quotation, dto, user);
    }
  }

  private async convertToInvoice(tenantId: string, shopId: string, quotation: any, user: any) {
    // Map quotation items to SalesInvoiceDto items
    const invoiceDto: any = {
      shopId,
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone,
      items: quotation.items.map((item) => ({
        shopProductId: item.shopProductId,
        quantity: item.quantity,
        rate: item.price, // mapQuotation already converted this to Rupees
        gstRate: item.gstRate,
      })),
      paymentMode: 'CASH', // Default
    };

    const invoice = await this.salesService.createInvoice(tenantId, invoiceDto);

    await this.prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        status: QuotationStatus.CONVERTED,
        conversionType: 'INVOICE',
        linkedInvoiceId: invoice.id,
        convertedAt: new Date(),
        convertedBy: user.sub,
      },
    });

    return { invoiceId: invoice.id };
  }

  private async convertToJobCard(tenantId: string, shopId: string, quotation: any, dto: ConvertQuotationDto, user: any) {
    const jobCardDto: any = {
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone,
      deviceType: dto.deviceType,
      deviceBrand: dto.deviceBrand,
      deviceModel: dto.deviceModel,
      customerComplaint: dto.customerComplaint || quotation.notes,
      estimatedCost: quotation.totalAmount,
    };

    const jobCard = await this.jobCardsService.create(user, shopId, jobCardDto);

    await this.prisma.quotation.update({
      where: { id: quotation.id },
      data: {
        status: QuotationStatus.CONVERTED,
        conversionType: 'JOB_CARD',
        linkedJobCardId: jobCard.id,
        convertedAt: new Date(),
        convertedBy: user.sub,
      },
    });

    return { jobCardId: jobCard.id };
  }

  async deleteQuotation(tenantId: string, shopId: string, id: string) {
    const quotation = await this.getQuotation(tenantId, shopId, id);

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT quotations can be deleted');
    }

    return this.prisma.$transaction([
      this.prisma.quotationItem.deleteMany({ where: { quotationId: id } }),
      this.prisma.quotation.delete({ where: { id } }),
    ]);
  }

  private calculateExpiryDate(date: string | Date, days: number): Date {
    const expiry = new Date(date);
    expiry.setDate(expiry.getDate() + days);
    return expiry;
  }
}
