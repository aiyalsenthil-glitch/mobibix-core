import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import {
  calculateGST,
  formatAsINR,
  paiseToRupees,
} from '../../../core/utils/currency.utils';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @InjectMetric('invoices_generated_total')
    private readonly invoicesGeneratedCounter: Counter<string>,
  ) {}

  /**
   * Generate next invoice number (sequential, format: INV-YYYY-NNNN)
   */
  /**
   * Generate next invoice number (sequential, format: INV-YYYY-NNNN)
   * This is now handled safely using a PostgreSQL sequence.
   */
  private async generateInvoiceNumber(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // Atomically get the next value from the Postgres sequence
    const result = await tx.$queryRaw<[{ nextval: string }]>`
      SELECT nextval('subscription_invoice_seq')
    `;

    const sequenceNumber = parseInt(result[0].nextval, 10);
    return `${prefix}${sequenceNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Calculate GST based on state
   * @param amount Base amount in paise
   * @param isInterstate Whether it's an inter-state transaction
   */
  private calculateGST(amount: number, isInterstate: boolean) {
    const totalGst = calculateGST(amount, 18); // 18% GST for digital services

    if (isInterstate) {
      return {
        cgst: 0,
        sgst: 0,
        igst: totalGst,
      };
    } else {
      const half = Math.round(totalGst / 2);
      return {
        cgst: half,
        sgst: half,
        igst: 0,
      };
    }
  }

  /**
   * Create invoice for a payment
   */
  /**
   * Create invoice for a payment
   */
  async createInvoiceForPayment(paymentId: string): Promise<any> {
    let retries = 0;
    const maxRetries = 3;
    // Capture email-related data outside the transaction so we can send after commit.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let emailContext: any = null;
    let createdInvoiceId: string | null = null;
    let createdInvoiceNumber: string | null = null;

    while (retries < maxRetries) {
      try {
        const invoice = await this.prisma.$transaction(
          async (tx) => {
            const payment = await tx.payment.findUnique({
              where: { id: paymentId },
              include: {
                tenant: {
                  select: {
                    id: true,
                    name: true,
                    contactPhone: true,
                    contactEmail: true,
                    code: true,
                  },
                },
              },
            });

            if (!payment) {
              throw new NotFoundException('Payment not found');
            }

            // Check if invoice already exists (idempotency)
            const existing = await tx.subscriptionInvoice.findUnique({
              where: { paymentId },
            });
            if (existing) {
              this.logger.log(`Invoice already exists for payment ${paymentId}`);
              return existing;
            }

            // Get tenant's state code for GST calculation
            const tenantFull = await tx.tenant.findUnique({
              where: { id: payment.tenantId },
              select: { state: true, stateCode: true },
            });

            const companyStateCode = 'TN';
            const isInterstate = tenantFull?.stateCode
              ? tenantFull.stateCode.trim().toUpperCase() !== companyStateCode
              : tenantFull?.state &&
                tenantFull.state.trim().toLowerCase() !== 'tamil nadu';

            const plan = await tx.plan.findUnique({
              where: { id: payment.planId },
              select: { id: true, name: true, module: true, code: true },
            });

            const invoiceNumber = await this.generateInvoiceNumber(tx);
            const gst = this.calculateGST(payment.amount, !!isInterstate);
            const total = payment.amount + gst.cgst! + gst.sgst! + gst.igst!;

            const invoice = await tx.subscriptionInvoice.create({
              data: {
                invoiceNumber,
                tenant: { connect: { id: payment.tenantId } },
                payment: { connect: { id: payment.id } },
                gstin: process.env.COMPANY_GSTIN || null,
                sacCode: '998314',
                invoiceDate: new Date(),
                amount: payment.amount,
                cgst: gst.cgst,
                sgst: gst.sgst,
                igst: gst.igst,
                total,
                description: `${plan?.name || 'Plan'} - ${payment.billingCycle}`,
                planSnapshot: {
                  planId: plan?.id,
                  planName: plan?.name,
                  module: plan?.module,
                  billingCycle: payment.billingCycle,
                },
                status: 'FINALIZED' as any,
              },
            });

            this.logger.log(`✅ Invoice ${invoiceNumber} created and FINALIZED for payment ${paymentId}`);

            // Capture email context for post-commit sending (PDF requires committed invoice)
            if (payment.tenant.contactEmail) {
              emailContext = {
                contactEmail: payment.tenant.contactEmail,
                tenantId: payment.tenant.id,
                tenantName: payment.tenant.name,
                total,
                module: plan?.module || 'GYM',
              };
              createdInvoiceId = invoice.id;
              createdInvoiceNumber = invoice.invoiceNumber;
            }

            return invoice;
          },
          { isolationLevel: 'Serializable' },
        );

        // ✅ Send email AFTER transaction commits — generatePDF reads the committed invoice
        const ctx = emailContext;
        if (ctx && createdInvoiceId && createdInvoiceNumber) {
          const invoiceId = createdInvoiceId;
          const invoiceNumber = createdInvoiceNumber;
          try {
            const pdfBuffer = (await this.generatePDF(invoiceId)) as Buffer;
            await this.emailService.send({
              tenantId: ctx.tenantId,
              recipientType: 'TENANT',
              emailType: 'PAYMENT_SUCCESS',
              referenceId: invoiceId,
              module: ctx.module as any,
              to: ctx.contactEmail,
              subject: `Tax Invoice ${invoiceNumber} - GymPilot`,
              data: {
                tenantName: ctx.tenantName,
                amount: ctx.total,
                invoiceNumber,
              },
              attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdfBuffer }],
            });
            await this.prisma.subscriptionInvoice.update({
              where: { id: invoiceId },
              data: { emailSent: true, emailSentAt: new Date() },
            });
          } catch (emailErr) {
            this.logger.error(`Failed to send invoice email to ${ctx.contactEmail}`, emailErr);
          }
        }

        return invoice;
      } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('invoiceNumber')) {
          retries++;
          this.logger.warn(`Invoice number collision, retry ${retries}/${maxRetries}...`);
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Failed to generate unique invoice number after multiple retries');
  }

  /**
   * Generate PDF for an invoice
   * If a stream is provided, it writes to the stream and resolves when done.
   * If no stream is provided, it resolves with a Buffer.
   */
  async generatePDF(
    invoiceId: string,
    outputStream?: import('stream').Writable,
  ): Promise<Buffer | void> {
    const invoice = await this.prisma.subscriptionInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        tenant: {
          select: {
            name: true,
            contactPhone: true,
            contactEmail: true,
            code: true,
          },
        },
        payment: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      if (outputStream) {
        doc.pipe(outputStream);
        outputStream.on('finish', () => resolve());
        outputStream.on('error', reject);
      } else {
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
      }

      // --- Header ---
      doc
        .fontSize(20)
        .text(process.env.COMPANY_NAME || 'GymPilot SaaS', 50, 45)
        .fontSize(10)
        .text(process.env.COMPANY_ADDRESS || '', 50, 70)
        .text(`GSTIN: ${invoice.gstin || 'Not Registered'}`, 50, 85)
        .text(` Email: ${process.env.COMPANY_EMAIL || ''}`, 50, 100);

      // Invoice Number and Date (Right aligned)
      doc
        .fontSize(10)
        .text(`Invoice #: ${invoice.invoiceNumber}`, 400, 45)
        .text(
          `Date: ${invoice.invoiceDate.toLocaleDateString('en-IN')}`,
          400,
          60,
        )
        .text(`SAC Code: 998314 (IT/Digital Services)`, 400, 75);

      // QR Code Placeholder (IRN)
      doc
        .strokeColor('#cccccc')
        .lineWidth(1)
        .rect(480, 20, 60, 60)
        .stroke()
        .fontSize(6)
        .text('QR Placeholder', 485, 45, { width: 50, align: 'center' });

      // Line separator
      doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, 120)
        .lineTo(560, 120)
        .stroke();

      // --- Bill To ---
      doc
        .fontSize(12)
        .fillColor('#000')
        .text('BILL TO:', 50, 140)
        .fontSize(10)
        .text(invoice.tenant.name, 50, 160)
        .text(`Phone: ${invoice.tenant.contactPhone || 'N/A'}`, 50, 175);

      if (invoice.customerGstin) {
        doc.text(`GSTIN: ${invoice.customerGstin}`, 50, 190);
      }

      // --- Line Items Table ---
      const tableTop = 250;
      doc.fontSize(10).fillColor('#000');

      // Table headers
      doc
        .font('Helvetica-Bold')
        .text('Description', 50, tableTop)
        .text('HSN/SAC', 250, tableTop)
        .text('Amount', 400, tableTop, { align: 'right', width: 110 });

      doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, tableTop + 15)
        .lineTo(560, tableTop + 15)
        .stroke();

      // Line item
      doc
        .font('Helvetica')
        .text(invoice.description, 50, tableTop + 25)
        .text(invoice.sacCode, 250, tableTop + 25)
        .text(formatAsINR(paiseToRupees(invoice.amount)), 400, tableTop + 25, {
          align: 'right',
          width: 110,
        });

      // --- Tax Breakdown ---
      const taxTop = tableTop + 60;

      doc
        .fontSize(10)
        .text('Subtotal:', 400, taxTop, { width: 80, align: 'right' })
        .text(formatAsINR(paiseToRupees(invoice.amount)), 480, taxTop, {
          width: 80,
          align: 'right',
        });

      if (invoice.cgst && invoice.cgst > 0) {
        doc
          .text('CGST (9%):', 400, taxTop + 15, { width: 80, align: 'right' })
          .text(formatAsINR(paiseToRupees(invoice.cgst)), 480, taxTop + 15, {
            width: 80,
            align: 'right',
          });

        doc
          .text('SGST (9%):', 400, taxTop + 30, { width: 80, align: 'right' })
          .text(formatAsINR(paiseToRupees(invoice.sgst)), 480, taxTop + 30, {
            width: 80,
            align: 'right',
          });
      }

      if (invoice.igst && invoice.igst > 0) {
        doc
          .text('IGST (18%):', 400, taxTop + 15, { width: 80, align: 'right' })
          .text(formatAsINR(paiseToRupees(invoice.igst)), 480, taxTop + 15, {
            width: 80,
            align: 'right',
          });
      }

      // Total
      doc
        .strokeColor('#000')
        .lineWidth(2)
        .moveTo(400, taxTop + 50)
        .lineTo(560, taxTop + 50)
        .stroke();

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('TOTAL:', 400, taxTop + 60, { width: 80, align: 'right' })
        .text(formatAsINR(paiseToRupees(invoice.total)), 480, taxTop + 60, {
          width: 80,
          align: 'right',
        });

      // --- Footer ---
      doc
        .fontSize(8)
        .fillColor('#777')
        .text(
          'This is a system-generated invoice and does not require a signature.',
          50,
          750,
          { align: 'center', width: 500 },
        )
        .text(`Payment ID: ${invoice.payment.id}`, 50, 765, {
          align: 'center',
          width: 500,
        });

      doc.end();
    });
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string) {
    return this.prisma.subscriptionInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        tenant: {
          select: {
            name: true,
            contactPhone: true,
            code: true,
          },
        },
        payment: true,
      },
    });
  }

  /**
   * Mark invoice as sent
   */
  async markAsSent(invoiceId: string) {
    return this.prisma.subscriptionInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'SENT' as any, // Will be SubscriptionInvoiceStatus.SENT after migration
        emailSent: true,
        emailSentAt: new Date(),
      },
    });
  }

  /**
   * Get all invoices for a tenant (Paginated)
   */
  async getInvoicesForTenant(tenantId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.subscriptionInvoice.findMany({
        where: { tenantId },
        orderBy: { invoiceDate: 'desc' },
        skip,
        take: limit,
        include: {
          payment: {
            select: {
              status: true,
              amount: true,
            },
          },
        },
      }),
      this.prisma.subscriptionInvoice.count({ where: { tenantId } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + items.length < total,
    };
  }
}
