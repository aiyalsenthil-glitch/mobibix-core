import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  InvoiceCreatedEvent,
  InvoicePaidEvent,
  JobStatusChangedEvent,
} from '../../../core/events/crm.events';
import { CrmIntegrationService } from './crm-integration.service';

@Injectable()
export class CrmEventListener {
  private readonly logger = new Logger(CrmEventListener.name);

  constructor(private readonly crmService: CrmIntegrationService) {}

  @OnEvent('invoice.created')
  handleInvoiceCreatedEvent(event: InvoiceCreatedEvent) {
    this.logger.log(
      `[CRM Event] Invoice Created: ${event.invoiceNumber} (Amt: ${event.amount}) - Tenant: ${event.tenantId}`,
    );
  }

  @OnEvent('invoice.paid')
  async handleInvoicePaidEvent(event: InvoicePaidEvent) {
    this.logger.log(
      `[CRM Event] Invoice Paid: ${event.invoiceId} (Amt: ${event.paidAmount}) - Customer: ${event.customerId}`,
    );

    if (event.customerId) {
        // TODO: Implement Transactional WhatsApp Sending
        // Requires looking up specific template for 'INVOICE_PAID' configured for this tenant.
        // await this.crmService.sendTransactionalMessage(
        //   event.tenantId,
        //   event.customerPhone, // Note: Event needs phone. Added to payload?
        //   'INVOICE_PAID',
        //   [String(event.paidAmount), event.invoiceNumber]
        // );
    }
  }

  @OnEvent('job.status.changed')
  async handleJobStatusChangedEvent(event: JobStatusChangedEvent) {
    this.logger.log(
      `[CRM Event] Job Status Changed: ${event.jobId} -> ${event.status} - Customer: ${event.customerId || 'Guest'}`,
    );

    if (event.customerPhone) {
        // TODO: Implement Transactional WhatsApp Sending
        // await this.crmService.sendTransactionalMessage(
        //   event.tenantId,
        //   event.customerPhone,
        //   'JOB_STATUS_UPDATE',
        //   [event.deviceModel, event.status]
        // );
    }
  }
}
