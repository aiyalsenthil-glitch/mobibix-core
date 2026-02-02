import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  InvoiceCreatedEvent,
  InvoicePaidEvent,
  JobStatusChangedEvent,
} from '../../../core/events/crm.events';
import { CrmIntegrationService } from './crm-integration.service';
import { AutomationService } from '../../whatsapp/automation.service';

@Injectable()
export class CrmEventListener {
  private readonly logger = new Logger(CrmEventListener.name);

  constructor(
    private readonly crmService: CrmIntegrationService,
    private readonly automationService: AutomationService,
  ) {}

  @OnEvent('invoice.created')
  async handleInvoiceCreatedEvent(event: InvoiceCreatedEvent) {
    this.logger.log(
      `[CRM Event] Invoice Created: ${event.invoiceNumber} (Amt: ${event.amount}) - Tenant: ${event.tenantId}`,
    );

    if (event.customerId) {
      try {
        await this.automationService.handleEvent({
          moduleType: 'MOBILE_SHOP',
          eventType: 'INVOICE_CREATED',
          tenantId: event.tenantId,
          customerId: event.customerId,
          entityId: event.invoiceId,
          payload: {
            invoiceNumber: event.invoiceNumber,
            amount: event.amount,
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to trigger automation for Invoice Created: ${(err as any).message}`,
          (err as any).stack,
        );
      }
    }
  }

  @OnEvent('invoice.paid')
  async handleInvoicePaidEvent(event: InvoicePaidEvent) {
    this.logger.log(
      `[CRM Event] Invoice Paid: ${event.invoiceId} (Amt: ${event.paidAmount}) - Customer: ${event.customerId}`,
    );

    if (event.customerId) {
      try {
        await this.automationService.handleEvent({
          moduleType: 'MOBILE_SHOP',
          eventType: 'INVOICE_PAID',
          tenantId: event.tenantId,
          customerId: event.customerId,
          entityId: event.invoiceId,
          payload: {
            paidAmount: event.paidAmount,
            paymentMode: event.paymentMode,
            isFullPayment: event.isFullPayment,
          },
        });
      } catch (err) {
        this.logger.error(
          `Failed to trigger automation for Invoice Paid: ${(err as any).message}`,
          (err as any).stack,
        );
      }
    }
  }

  /**
   * 🎯 JOB STATUS CHANGED EVENT HANDLER
   * ─────────────────────────────────────────────────
   * CRITICAL FILTER: Only triggers WhatsApp for READY status
   *
   * Other statuses (DIAGNOSING, IN_PROGRESS, etc.) are internal workflow states
   * and should NOT trigger customer notifications.
   */
  @OnEvent('job.status.changed')
  async handleJobStatusChangedEvent(event: JobStatusChangedEvent) {
    this.logger.log(
      `[CRM Event] Job Status Changed: ${event.jobId} -> ${event.status}`
    );

    // 🚨 CRITICAL FAILSAGE: STRICTLY ONLY "READY" TRIGGER
    // User Requirement: "READY is the single customer-facing milestone"
    // DELIVERED -> No WhatsApp (Avoids duplicate with invoice payment msg)
    // CANCELLED -> No WhatsApp (Avoids conflict/confusion)
    if (event.status !== 'READY') {
      return;
    }

    // Only proceed for jobs with customers
    if (!event.customerId) {
      this.logger.warn(`Job ${event.jobId} has no customer ID, skipping automation`);
      return;
    }

    this.logger.log(
      `✅ Triggering WhatsApp automation for JOB_READY: ${event.jobId}`
    );

    // Trigger WhatsApp automation for JOB_READY event
    await this.automationService.handleEvent({
      moduleType: 'MOBILE_SHOP',
      eventType: 'JOB_READY',
      tenantId: event.tenantId,
      customerId: event.customerId,
      entityId: event.jobId,
      payload: {
        status: event.status,
        deviceModel: event.deviceModel,
        customerPhone: event.customerPhone,
      },
    });
  }
}
