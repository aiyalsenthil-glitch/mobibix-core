import { Injectable, HttpException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * CORE CRM Integration Service for MobiBix
 *
 * Purpose: Encapsulate all HTTP calls to CORE CRM APIs
 * - Dashboard KPIs
 * - Follow-ups CRUD
 * - Customer Timeline
 * - WhatsApp sending
 *
 * Key: MobiBix uses this service ONLY - never re-implements CRM logic
 */
@Injectable()
export class CrmIntegrationService {
  private readonly logger = new Logger(CrmIntegrationService.name);

  constructor(private readonly http: HttpService) {}

  // ========================
  // 1️⃣ DASHBOARD KPIs
  // ========================

  /**
   * Fetch CRM Dashboard metrics
   * Used for MobiBix home screen widgets
   */
  async getDashboardMetrics(
    headers: Record<string, string>,
    preset = 'LAST_30_DAYS',
    shopId?: string,
  ) {
    try {
      const params: Record<string, string> = { preset };
      if (shopId) params.shopId = shopId;

      const response = await firstValueFrom(
        this.http.get('/api/core/crm-dashboard', {
          headers,
          params,
        }),
      );

      this.logger.debug(`Dashboard metrics fetched (preset: ${preset})`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch dashboard metrics: ${error.message}`);
      throw new HttpException(
        `Dashboard metrics error: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  // ========================
  // 2️⃣ FOLLOW-UPS CRUD
  // ========================

  /**
   * Get follow-ups assigned to current user
   */
  async getMyFollowUps(headers: Record<string, string>) {
    try {
      const response = await firstValueFrom(
        this.http.get('/api/core/follow-ups/my', { headers }),
      );

      this.logger.debug(`My follow-ups fetched: ${response.data.length} items`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch follow-ups: ${error.message}`);
      throw new HttpException(
        `Follow-ups fetch error: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Get all follow-ups (for OWNER only)
   */
  async getAllFollowUps(headers: Record<string, string>) {
    try {
      const response = await firstValueFrom(
        this.http.get('/api/core/follow-ups/all', { headers }),
      );

      this.logger.debug(
        `All follow-ups fetched: ${response.data.length} items`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch all follow-ups: ${error.message}`);
      throw new HttpException(
        `All follow-ups fetch error: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Create a follow-up from MobiBix (e.g., from Job Card)
   */
  async createFollowUp(
    headers: Record<string, string>,
    data: {
      customerId: string;
      type: string; // e.g., 'PHONE_CALL', 'EMAIL', 'VISIT'
      purpose: string; // e.g., 'Follow up after repair'
      followUpAt: string; // ISO date
      assignedToUserId?: string;
      shopId?: string;
    },
  ) {
    try {
      const response = await firstValueFrom(
        this.http.post('/api/core/follow-ups', data, { headers }),
      );

      this.logger.log(
        `Follow-up created for customer ${data.customerId} (purpose: ${data.purpose})`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create follow-up: ${error.message}`);
      throw new HttpException(
        `Follow-up creation error: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Update a follow-up
   */
  async updateFollowUp(
    headers: Record<string, string>,
    followUpId: string,
    data: {
      purpose?: string;
      followUpAt?: string;
      assignedToUserId?: string;
    },
  ) {
    try {
      const response = await firstValueFrom(
        this.http.patch(`/api/core/follow-ups/${followUpId}`, data, {
          headers,
        }),
      );

      this.logger.log(`Follow-up ${followUpId} updated`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update follow-up: ${error.message}`);
      throw new HttpException(
        `Follow-up update error: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Change follow-up status (PENDING → DONE/CANCELLED)
   */
  async updateFollowUpStatus(
    headers: Record<string, string>,
    followUpId: string,
    status: 'PENDING' | 'DONE' | 'CANCELLED',
  ) {
    try {
      const response = await firstValueFrom(
        this.http.patch(
          `/api/core/follow-ups/${followUpId}/status`,
          { status },
          { headers },
        ),
      );

      this.logger.log(`Follow-up ${followUpId} status changed to ${status}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update follow-up status: ${error.message}`);
      throw new HttpException(
        `Follow-up status update error: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  // ========================
  // 3️⃣ CUSTOMER TIMELINE
  // ========================

  /**
   * Get customer timeline (all CRM activities)
   * Filters by source: JOB, INVOICE, CRM, WHATSAPP
   */
  async getCustomerTimeline(
    headers: Record<string, string>,
    customerId: string,
    source?: string, // Comma-separated: 'JOB,INVOICE,CRM,WHATSAPP'
  ) {
    try {
      const params: Record<string, string> = {};
      if (source) params.source = source;

      const response = await firstValueFrom(
        this.http.get(`/api/core/customer-timeline/${customerId}`, {
          headers,
          params,
        }),
      );

      this.logger.debug(
        `Timeline for customer ${customerId} fetched: ${response.data.items.length} items`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch customer timeline: ${error.message}`);
      throw new HttpException(
        `Customer timeline error: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  // ========================
  // 4️⃣ WHATSAPP MESSAGING
  // ========================

  /**
   * Send WhatsApp message
   * Called from MobiBix events (Job Ready, Invoice Created, etc.)
   */
  async sendWhatsAppMessage(
    headers: Record<string, string>,
    data: {
      customerId: string;
      phone: string;
      message: string;
      messageType?: 'TEXT' | 'TEMPLATE'; // Defaults to TEXT
      channel?: string; // Defaults to WHATSAPP
      source?: string; // e.g., 'JOB_READY', 'INVOICE_CREATED'
      sourceId?: string; // Reference to job card ID or invoice ID
    },
  ) {
    try {
      const payload = {
        ...data,
        messageType: data.messageType || 'TEXT',
        channel: data.channel || 'WHATSAPP',
      };

      const response = await firstValueFrom(
        this.http.post('/api/modules/whatsapp/send', payload, { headers }),
      );

      this.logger.log(
        `WhatsApp sent to ${data.phone} (source: ${data.source || 'MANUAL'})`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp: ${error.message}`);
      throw new HttpException(
        `WhatsApp send error: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  /**
   * Get WhatsApp logs for a customer
   */
  async getWhatsAppLogs(
    headers: Record<string, string>,
    customerId?: string,
    limit = 20,
  ) {
    try {
      const params: Record<string, any> = { limit };
      if (customerId) params.customerId = customerId;

      const response = await firstValueFrom(
        this.http.get('/api/modules/whatsapp/logs', { headers, params }),
      );

      this.logger.debug(`WhatsApp logs fetched: ${response.data.length} items`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch WhatsApp logs: ${error.message}`);
      throw new HttpException(
        `WhatsApp logs error: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  // ========================
  // HELPER METHODS
  // ========================

  /**
   * Build auth headers from JWT token
   */
  buildAuthHeaders(jwtToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Validate service health (optional)
   */
  async healthCheck(headers: Record<string, string>): Promise<boolean> {
    try {
      await firstValueFrom(this.http.get('/api/health', { headers }));
      return true;
    } catch {
      return false;
    }
  }
}
