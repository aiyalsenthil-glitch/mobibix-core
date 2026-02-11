import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CustomerTimelineResponseDto,
  GetCustomerTimelineDto,
  TimelineEntryDto,
} from './dto/timeline.dto';
import { TimelineActivityType, TimelineSource } from './timeline.enum';

@Injectable()
export class CustomerTimelineService {
  private readonly logger = new Logger(CustomerTimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get unified customer timeline by aggregating activities from multiple sources
   */
  async getCustomerTimeline(
    query: GetCustomerTimelineDto,
  ): Promise<CustomerTimelineResponseDto> {
    const { customerId, tenantId, page = 1, pageSize = 20 } = query;

    try {
      // Fetch activities from all sources in parallel
      const [
        invoices,
        jobCards,
        receipts,
        quotations,
        followUps,
        reminders,
        whatsappLogs,
        loyaltyTransactions,
        alerts,
      ] = await Promise.all([
        this.getInvoiceActivities(customerId, tenantId, query),
        this.getJobCardActivities(customerId, tenantId, query),
        this.getReceiptActivities(customerId, tenantId, query),
        this.getQuotationActivities(customerId, tenantId, query),
        this.getFollowUpActivities(customerId, tenantId, query),
        this.getReminderActivities(customerId, tenantId, query),
        this.getWhatsAppActivities(customerId, tenantId, query),
        this.getLoyaltyActivities(customerId, tenantId, query),
        this.getAlertActivities(customerId, tenantId, query),
      ]);

      // Combine all activities
      let allActivities: TimelineEntryDto[] = [
        ...invoices,
        ...jobCards,
        ...receipts,
        ...quotations,
        ...followUps,
        ...reminders,
        ...whatsappLogs,
        ...loyaltyTransactions,
        ...alerts,
      ];

      // Apply type filters if specified
      if (query.types && query.types.length > 0) {
        const types = query.types;
        allActivities = allActivities.filter((a) => types.includes(a.type));
      }

      // Apply source filters if specified
      if (query.sources && query.sources.length > 0) {
        const sources = query.sources;
        allActivities = allActivities.filter((a) => sources.includes(a.source));
      }

      // Sort by createdAt
      allActivities.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return query.sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
      });

      // Pagination
      const total = allActivities.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedItems = allActivities.slice(startIndex, endIndex);

      return {
        items: paginatedItems,
        total,
        page,
        pageSize,
        hasMore: endIndex < total,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error(
        `Failed to fetch customer timeline: ${err.message}`,
        err,
      );
      throw err;
    }
  }

  /**
   * Get invoice activities
   */
  private async getInvoiceActivities(
    customerId: string,
    tenantId: string,
    query: GetCustomerTimelineDto,
  ): Promise<TimelineEntryDto[]> {
    const prisma = this.prisma;
    // Skip if source filter excludes invoices
    if (
      query.sources &&
      query.sources.length > 0 &&
      !query.sources.includes(TimelineSource.INVOICE)
    ) {
      return [];
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        customerId,
        ...(query.startDate && { createdAt: { gte: query.startDate } }),
        ...(query.endDate && { createdAt: { lte: query.endDate } }),
        ...(query.shopId && { shopId: query.shopId }),
      },
      include: {
        shop: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activities: TimelineEntryDto[] = [];

    for (const invoice of invoices) {
      // Invoice created
      activities.push({
        id: `invoice-created-${invoice.id}`,
        type: TimelineActivityType.INVOICE_CREATED,
        source: TimelineSource.INVOICE,
        title: `Invoice #${invoice.invoiceNumber} Created`,
        description: `Invoice for ₹${invoice.totalAmount.toLocaleString()}`,
        icon: '🧾',
        referenceId: invoice.id,
        referenceType: 'Invoice',
        referenceUrl: `/invoices/${invoice.id}`,
        amount: invoice.totalAmount,
        status: invoice.status,
        createdAt: invoice.invoiceDate,
        updatedAt: undefined, // Invoice does not have modified time
        shopName: invoice.shop?.name,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          subtotal: invoice.subTotal,
          gstAmount: invoice.gstAmount,
        },
      });

      // Invoice paid (if status is PAID)
      if (invoice.status === 'PAID') {
        activities.push({
          id: `invoice-paid-${invoice.id}`,
          type: TimelineActivityType.INVOICE_PAID,
          source: TimelineSource.INVOICE,
          title: `Invoice #${invoice.invoiceNumber} Paid`,
          description: `Payment received: ₹${invoice.totalAmount.toLocaleString()}`,
          icon: '✅',
          referenceId: invoice.id,
          referenceType: 'Invoice',
          referenceUrl: `/invoices/${invoice.id}`,
          amount: invoice.totalAmount,
          status: 'PAID',
          createdAt: invoice.invoiceDate, // Use invoiceDate as payment time approximate
          shopName: invoice.shop?.name,
        });
      }
    }

    return activities;
  }

  /**
   * Get job card activities
   */
  private async getJobCardActivities(
    customerId: string,
    tenantId: string,
    query: GetCustomerTimelineDto,
  ): Promise<TimelineEntryDto[]> {
    const prisma = this.prisma;
    if (
      query.sources &&
      query.sources.length > 0 &&
      !query.sources.includes(TimelineSource.JOB)
    ) {
      return [];
    }

    const jobCards = await prisma.jobCard.findMany({
      where: {
        tenantId,
        customerId,
        ...(query.startDate && { createdAt: { gte: query.startDate } }),
        ...(query.endDate && { createdAt: { lte: query.endDate } }),
        ...(query.shopId && { shopId: query.shopId }),
      },
      include: {
        shop: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activities: TimelineEntryDto[] = [];

    for (const job of jobCards) {
      // Job created
      activities.push({
        id: `job-created-${job.id}`,
        type: TimelineActivityType.JOB_CREATED,
        source: TimelineSource.JOB,
        title: `Job Card #${job.jobNumber} Created`,
        description: `${job.customerComplaint}`,
        icon: '🔧',
        referenceId: job.id,
        referenceType: 'JobCard',
        referenceUrl: `/jobs/${job.id}`,
        status: job.status,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        shopName: job.shop?.name,
        metadata: {
          jobNumber: job.jobNumber,
          deviceBrand: job.deviceBrand,
          deviceModel: job.deviceModel,
          imei: job.deviceSerial,
        },
      });

      // Job delivered (if status is DELIVERED)
      if (job.status === 'DELIVERED') {
        activities.push({
          id: `job-delivered-${job.id}`,
          type: TimelineActivityType.JOB_DELIVERED,
          source: TimelineSource.JOB,
          title: `Job #${job.jobNumber} Delivered`,
          description: `Service completed and delivered`,
          icon: '✅',
          referenceId: job.id,
          referenceType: 'JobCard',
          referenceUrl: `/jobs/${job.id}`,
          status: 'DELIVERED',
          createdAt: job.updatedAt,
          shopName: job.shop?.name,
        });
      }
    }

    return activities;
  }

  /**
   * Get receipt/payment activities
   */
  private async getReceiptActivities(
    customerId: string,
    tenantId: string,
    query: GetCustomerTimelineDto,
  ): Promise<TimelineEntryDto[]> {
    const prisma = this.prisma;
    if (
      query.sources &&
      query.sources.length > 0 &&
      !query.sources.includes(TimelineSource.RECEIPT)
    ) {
      return [];
    }

    const receipts = await prisma.receipt.findMany({
      where: {
        tenantId,
        customerId,
        ...(query.startDate && { createdAt: { gte: query.startDate } }),
        ...(query.endDate && { createdAt: { lte: query.endDate } }),
        ...(query.shopId && { shopId: query.shopId }),
      },
      include: {
        shop: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return receipts.map((receipt) => ({
      id: `receipt-${receipt.id}`,
      type: TimelineActivityType.PAYMENT_RECEIVED,
      source: TimelineSource.RECEIPT,
      title: `Payment Received`,
      description: `Receipt #${receipt.printNumber} - ${receipt.paymentMethod}`,
      icon: '💰',
      referenceId: receipt.id,
      referenceType: 'Receipt',
      referenceUrl: `/receipts/${receipt.id}`,
      amount: receipt.amount,
      status: receipt.status,
      createdAt: receipt.createdAt,
      shopName: receipt.shop?.name,
      metadata: {
        receiptNumber: receipt.printNumber,
        paymentMode: receipt.paymentMethod,
        receiptType: receipt.receiptType,
      },
    }));
  }

  /**
   * Get quotation activities
   */
  private async getQuotationActivities(
    customerId: string,
    tenantId: string,
    query: GetCustomerTimelineDto,
  ): Promise<TimelineEntryDto[]> {
    const prisma = this.prisma;
    if (
      query.sources &&
      query.sources.length > 0 &&
      !query.sources.includes(TimelineSource.QUOTATION)
    ) {
      return [];
    }

    const quotations = await prisma.quotation.findMany({
      where: {
        tenantId,
        customerId,
        ...(query.startDate && { createdAt: { gte: query.startDate } }),
        ...(query.endDate && { createdAt: { lte: query.endDate } }),
        ...(query.shopId && { shopId: query.shopId }),
      },
      include: {
        shop: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return quotations.map((quote) => ({
      id: `quotation-${quote.id}`,
      type: TimelineActivityType.QUOTATION_CREATED,
      source: TimelineSource.QUOTATION,
      title: `Quotation #${quote.quotationNumber} Created`,
      description: `Quote for ₹${quote.totalAmount.toLocaleString()}`,
      icon: '📋',
      referenceId: quote.id,
      referenceType: 'Quotation',
      referenceUrl: `/quotations/${quote.id}`,
      amount: quote.totalAmount,
      status: quote.status,
      createdAt: quote.createdAt,
      shopName: quote.shop?.name,
      metadata: {
        quotationNumber: quote.quotationNumber,
        validUntil: quote.expiryDate,
      },
    }));
  }

  /**
   * Get follow-up activities
   */
  private async getFollowUpActivities(
    customerId: string,
    tenantId: string,
    query: GetCustomerTimelineDto,
  ): Promise<TimelineEntryDto[]> {
    const prisma = this.prisma;
    if (
      query.sources &&
      query.sources.length > 0 &&
      !query.sources.includes(TimelineSource.FOLLOW_UP)
    ) {
      return [];
    }

    const followUps = await prisma.customerFollowUp.findMany({
      where: {
        tenantId,
        customerId,
        ...(query.startDate && { createdAt: { gte: query.startDate } }),
        ...(query.endDate && { createdAt: { lte: query.endDate } }),
        ...(query.shopId && { shopId: query.shopId }),
      },
      include: {
        shop: { select: { name: true } },
        assignedToUser: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activities: TimelineEntryDto[] = [];

    for (const followUp of followUps) {
      // Follow-up created
      const typeIcons = {
        CALL: '📞',
        WHATSAPP: '💬',
        VISIT: '👤',
        EMAIL: '📧',
        SMS: '📱',
      };

      activities.push({
        id: `followup-created-${followUp.id}`,
        type: TimelineActivityType.FOLLOWUP_CREATED,
        source: TimelineSource.FOLLOW_UP,
        title: `Follow-Up Scheduled: ${followUp.type}`,
        description: `${followUp.purpose} - ${followUp.note || 'No notes'}`,
        icon: typeIcons[followUp.type] || '📌',
        referenceId: followUp.id,
        referenceType: 'CustomerFollowUp',
        status: followUp.status,
        createdAt: followUp.createdAt,
        updatedAt: followUp.updatedAt,
        shopName: followUp.shop?.name,
        userName: followUp.assignedToUser?.fullName ?? undefined,
        metadata: {
          type: followUp.type,
          purpose: followUp.purpose,
          followUpAt: followUp.followUpAt,
          assignedTo: followUp.assignedToUser?.fullName,
        },
      });

      // Follow-up completed
      if (followUp.status === 'DONE') {
        activities.push({
          id: `followup-done-${followUp.id}`,
          type: TimelineActivityType.FOLLOWUP_COMPLETED,
          source: TimelineSource.FOLLOW_UP,
          title: `Follow-Up Completed: ${followUp.type}`,
          description: `${followUp.purpose} completed`,
          icon: '✅',
          referenceId: followUp.id,
          referenceType: 'CustomerFollowUp',
          status: 'DONE',
          createdAt: followUp.updatedAt,
          shopName: followUp.shop?.name,
          userName: followUp.assignedToUser?.fullName ?? undefined,
        });
      }
    }

    return activities;
  }

  /**
   * Get reminder activities
   */
  private async getReminderActivities(
    customerId: string,
    tenantId: string,
    query: GetCustomerTimelineDto,
  ): Promise<TimelineEntryDto[]> {
    const prisma = this.prisma;
    if (
      query.sources &&
      query.sources.length > 0 &&
      !query.sources.includes(TimelineSource.REMINDER)
    ) {
      return [];
    }

    const reminders = await prisma.customerReminder.findMany({
      where: {
        tenantId,
        customerId,
        status: { in: ['SENT', 'FAILED'] }, // Only sent/failed reminders
        ...(query.startDate && { sentAt: { gte: query.startDate } }),
        ...(query.endDate && { sentAt: { lte: query.endDate } }),
      },
      orderBy: { sentAt: 'desc' },
    });

    return reminders
      .filter((r) => r.sentAt) // Only reminders with sentAt timestamp
      .map((reminder) => ({
        id: `reminder-${reminder.id}`,
        type:
          reminder.status === 'SENT'
            ? TimelineActivityType.REMINDER_SENT
            : TimelineActivityType.REMINDER_FAILED,
        source: TimelineSource.REMINDER,
        title: `Reminder ${reminder.status === 'SENT' ? 'Sent' : 'Failed'}`,
        description: `${reminder.channel} - ${reminder.templateKey}`,
        icon: reminder.status === 'SENT' ? '🔔' : '❌',
        referenceId: reminder.id,
        referenceType: 'CustomerReminder',
        status: reminder.status,
        createdAt: reminder.sentAt!,
        metadata: {
          channel: reminder.channel,
          templateKey: reminder.templateKey,
          triggerType: reminder.triggerType,
          failureReason: reminder.failureReason,
        },
      }));
  }

  /**
   * Get WhatsApp activities
   */
  private async getWhatsAppActivities(
    customerId: string,
    tenantId: string,
    query: GetCustomerTimelineDto,
  ): Promise<TimelineEntryDto[]> {
    const prisma = this.prisma;
    if (
      query.sources &&
      query.sources.length > 0 &&
      !query.sources.includes(TimelineSource.WHATSAPP)
    ) {
      return [];
    }

    // Get customer phone to match WhatsApp logs
    const customer = await prisma.party.findUnique({
      where: { id: customerId },
      select: { phone: true },
    });

    if (!customer) return [];

    const whatsappLogs = await prisma.whatsAppLog.findMany({
      where: {
        tenantId,
        phone: customer.phone,
        ...(query.startDate && { createdAt: { gte: query.startDate } }),
        ...(query.endDate && { createdAt: { lte: query.endDate } }),
      },
      orderBy: { sentAt: 'desc' },
      take: 50, // Limit WhatsApp logs
    });

    return whatsappLogs.map((log) => ({
      id: `whatsapp-${log.id}`,
      type:
        log.status === 'failed'
          ? TimelineActivityType.WHATSAPP_FAILED
          : TimelineActivityType.WHATSAPP_SENT,
      source: TimelineSource.WHATSAPP,
      title: `WhatsApp ${log.status === 'failed' ? 'Failed' : 'Sent'}`,
      description: `Message Type: ${log.type}`, // Message content not available in log
      icon: log.status === 'failed' ? '❌' : '💬',
      referenceId: log.id,
      referenceType: 'WhatsAppLog',
      status: log.status || undefined,
      createdAt: log.sentAt,
      metadata: {
        error: log.error,
      },
    }));
  }

  /**
   * Get loyalty transaction activities
   */
  private async getLoyaltyActivities(
    customerId: string,
    tenantId: string,
    query: GetCustomerTimelineDto,
  ): Promise<TimelineEntryDto[]> {
    const prisma = this.prisma;
    if (
      query.sources &&
      query.sources.length > 0 &&
      !query.sources.includes(TimelineSource.LOYALTY)
    ) {
      return [];
    }

    const transactions = await prisma.loyaltyTransaction.findMany({
      where: {
        tenantId,
        customerId,
        ...(query.startDate && { createdAt: { gte: query.startDate } }),
        ...(query.endDate && { createdAt: { lte: query.endDate } }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map((txn) => ({
      id: `loyalty-${txn.id}`,
      type:
        txn.points > 0
          ? TimelineActivityType.LOYALTY_EARNED
          : TimelineActivityType.LOYALTY_REDEEMED,
      source: TimelineSource.LOYALTY,
      title: `Loyalty Points ${txn.points > 0 ? 'Earned' : 'Redeemed'}`,
      description: `${Math.abs(txn.points)} points - ${txn.source}`,
      icon: txn.points > 0 ? '⭐' : '🎁',
      referenceId: txn.id,
      referenceType: 'LoyaltyTransaction',
      amount: Math.abs(txn.points),
      createdAt: txn.createdAt,
      metadata: {
        points: txn.points,
        source: txn.source,
        invoiceId: txn.invoiceId,
        reversalOf: txn.reversalOf,
        note: txn.note,
      },
    }));
  }

  /**
   * Get customer alert activities
   */
  private async getAlertActivities(
    customerId: string,
    tenantId: string,
    query: GetCustomerTimelineDto,
  ): Promise<TimelineEntryDto[]> {
    const prisma = this.prisma;
    if (
      query.sources &&
      query.sources.length > 0 &&
      !query.sources.includes(TimelineSource.ALERT)
    ) {
      return [];
    }

    const alerts = await prisma.customerAlert.findMany({
      where: {
        tenantId,
        customerId,
        ...(query.startDate && { createdAt: { gte: query.startDate } }),
        ...(query.endDate && { createdAt: { lte: query.endDate } }),
      },
      orderBy: { createdAt: 'desc' },
    });

    const activities: TimelineEntryDto[] = [];

    for (const alert of alerts) {
      // Alert created
      const severityIcons = {
        INFO: 'ℹ️',
        WARNING: '⚠️',
        CRITICAL: '🔴',
      };

      activities.push({
        id: `alert-created-${alert.id}`,
        type: TimelineActivityType.ALERT_CREATED,
        source: TimelineSource.ALERT,
        title: `Alert: ${alert.severity}`,
        description: alert.message,
        icon: severityIcons[alert.severity],
        referenceId: alert.id,
        referenceType: 'CustomerAlert',
        status: alert.resolved ? 'RESOLVED' : 'ACTIVE',
        createdAt: alert.createdAt,
        metadata: {
          severity: alert.severity,
          source: alert.source,
          resolved: alert.resolved,
          resolvedAt: alert.resolvedAt,
        },
      });

      // Alert resolved
      if (alert.resolved && alert.resolvedAt) {
        activities.push({
          id: `alert-resolved-${alert.id}`,
          type: TimelineActivityType.ALERT_RESOLVED,
          source: TimelineSource.ALERT,
          title: `Alert Resolved`,
          description: alert.message,
          icon: '✅',
          referenceId: alert.id,
          referenceType: 'CustomerAlert',
          status: 'RESOLVED',
          createdAt: alert.resolvedAt,
        });
      }
    }

    return activities;
  }

  /**
   * Get timeline summary statistics
   */
  async getTimelineStats(customerId: string, tenantId: string) {
    const prisma = this.prisma;
    const [
      invoiceCount,
      jobCount,
      followUpCount,
      loyaltyBalance,
      lastInvoice,
      lastJob,
    ] = await Promise.all([
      prisma.invoice.count({ where: { tenantId, customerId } }),
      prisma.jobCard.count({ where: { tenantId, customerId } }),
      prisma.customerFollowUp.count({ where: { tenantId, customerId } }),
      prisma.loyaltyTransaction
        .findMany({ where: { tenantId, customerId } })
        .then((txns) => txns.reduce((sum, t) => sum + t.points, 0)),
      prisma.invoice.findFirst({
        where: { tenantId, customerId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.jobCard.findFirst({
        where: { tenantId, customerId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, status: true },
      }),
    ]);

    return {
      totalInvoices: invoiceCount,
      totalJobs: jobCount,
      totalFollowUps: followUpCount,
      loyaltyPoints: loyaltyBalance,
      lastInvoiceDate: lastInvoice?.createdAt,
      lastInvoiceAmount: lastInvoice?.totalAmount,
      lastJobDate: lastJob?.createdAt,
      lastJobStatus: lastJob?.status,
    };
  }
}
