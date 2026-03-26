import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AutomationService } from '../../whatsapp/automation.service';
import { addDays, subDays, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class CrmAutomationCron {
  private readonly logger = new Logger(CrmAutomationCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly automationService: AutomationService,
  ) {}

  /**
   * 🤖 CRM AUTOMATION RUNNER
   * Runs daily at 9:00 AM local time
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runDailyAutomations() {
    this.logger.log('🚀 CRM Automations: Commencing daily scans for retention/warranty triggers...');
    
    try {
      await Promise.allSettled([
        this.generateWarrantyExpiringReminders(),
        this.generatePostRepairReminders(),
        this.generateWinBackReminders(),
      ]);
      this.logger.log('✅ CRM Automations: Daily scan complete.');
    } catch (err) {
      this.logger.error('❌ CRM Automations: Unexpected global error in daily scan', err.stack);
    }
  }

  /**
   * 🛒 1. WARRANTY EXPIRY (15 Days Notice)
   * Scan for invoice items whose warranty expires exactly 15 days from now.
   */
  private async generateWarrantyExpiringReminders() {
    const targetDate = addDays(new Date(), 15);
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    this.logger.debug(`Looking for warranty expiries between ${start.toISOString()} and ${end.toISOString()}`);

    const items = await this.prisma.invoiceItem.findMany({
      where: {
        warrantyEndAt: { gte: start, lte: end },
        invoice: { deletedAt: null }
      },
      include: { invoice: true, product: true }
    });

    for (const item of items) {
      if (!item.invoice.customerId) continue;
      
      this.logger.log(`[WARRANTY] Triggering for Customer ${item.invoice.customerId} (Product: ${item.product.name})`);
      
      await this.automationService.handleEvent({
        moduleType: 'MOBILE_SHOP',
        eventType: 'WARRANTY_EXPIRY',
        tenantId: item.invoice.tenantId,
        customerId: item.invoice.customerId,
        entityId: item.invoice.id,
        payload: {
          productName: item.product.name,
          expiryDate: item.warrantyEndAt,
          invoiceNumber: item.invoice.invoiceNumber,
        }
      });
    }
  }

  /**
   * 🛠 2. POST-REPAIR FEEDBACK (2 Days Post-Delivery)
   * Scan for job cards delivered exactly 2 days ago.
   */
  private async generatePostRepairReminders() {
    const targetDate = subDays(new Date(), 2);
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    const jobCards = await this.prisma.jobCard.findMany({
      where: {
        deliveredAt: { gte: start, lte: end },
        deletedAt: null
      }
    });

    for (const job of jobCards) {
      if (!job.customerId) continue;

      this.logger.log(`[SATISFACTION] Triggering for Customer ${job.customerId} (Job: ${job.jobNumber})`);

      await this.automationService.handleEvent({
        moduleType: 'MOBILE_SHOP',
        eventType: 'POST_REPAIR_SURVEY',
        tenantId: job.tenantId,
        customerId: job.customerId,
        entityId: job.id,
        payload: {
          jobNumber: job.jobNumber,
          deviceModel: job.deviceModel,
        }
      });
    }
  }

  /**
   * 💰 3. CUSTOMER WIN-BACK (90 Days Inactive)
   * Scan for customers whose latest invoice was exactly 90 days ago.
   */
  private async generateWinBackReminders() {
    const targetDate = subDays(new Date(), 90);
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    // Heuristic: Find customers whose latest transaction link (e.g. Invoice) was on this target date
    // and they haven't had any transaction SINCE then.
    
    // In practice, we skip complex "since then" check for Phase 1 to ensure some messages flow.
    // We look for customers whose latest invoice date is exactly the target date.
    
    // This is a simplified "Win-back" logic for now.
    const invoices = await this.prisma.invoice.findMany({
      where: {
        invoiceDate: { gte: start, lte: end },
        deletedAt: null
      },
      distinct: ['customerId']
    });

    for (const inv of invoices) {
      if (!inv.customerId) continue;

      // Verify they haven't had a new invoice since then
      const newerInvoices = await this.prisma.invoice.count({
        where: {
          customerId: inv.customerId,
          invoiceDate: { gt: end },
          deletedAt: null
        }
      });

      if (newerInvoices === 0) {
        this.logger.log(`[WIN-BACK] Triggering for Customer ${inv.customerId} (Last inv: ${inv.invoiceNumber})`);

        await this.automationService.handleEvent({
          moduleType: 'MOBILE_SHOP',
          eventType: 'CUSTOMER_WIN_BACK',
          tenantId: inv.tenantId,
          customerId: inv.customerId,
          entityId: inv.customerId,
          payload: {
            lastInvoiceDate: inv.invoiceDate,
            customerName: inv.customerName,
          }
        });
      }
    }
  }
}
