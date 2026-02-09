import { HttpException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WhatsAppSender } from '../../whatsapp/whatsapp.sender';

@Injectable()
export class CrmIntegrationService {
  private readonly logger = new Logger(CrmIntegrationService.name);

  constructor(
    private readonly http: HttpService,
    private readonly whatsAppSender: WhatsAppSender,
  ) {}

  // ========================
  // 1️⃣ DASHBOARD
  // ========================

  async getDashboardMetrics(
    headers: Record<string, string>,
    preset: string = 'LAST_30_DAYS',
    shopId?: string,
  ) {
    try {
      const params: any = { preset };
      if (shopId) params.shopId = shopId;

      const response = await firstValueFrom(
        this.http.get(`/api/core/dashboard/metrics`, {
          headers,
          params,
        }),
      );
      return response.data;
    } catch (error) {
      // Graceful fallback
      return { totalRevenue: 0, pendingJobs: 0, lowStock: 0 };
    }
  }

  // ========================
  // 2️⃣ FOLLOW-UPS
  // ========================

  async getMyFollowUps(headers: Record<string, string>) {
    try {
      const response = await firstValueFrom(
        this.http.get('/api/core/follow-ups/my', { headers }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch my follow-ups: ${error.message}`);
      throw new HttpException(
        `Fetch follow-ups error: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  async getFollowUpCounts(headers: Record<string, string>) {
    try {
      const response = await firstValueFrom(
        this.http.get('/api/core/follow-ups/counts', { headers }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch follow-up counts: ${error.message}`);
      throw new HttpException(
        `Fetch follow-up counts error: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

  async createFollowUp(headers: Record<string, string>, dto: any) {
    try {
      const response = await firstValueFrom(
        this.http.post('/api/core/follow-ups', dto, { headers }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create follow-up: ${error.message}`);
      throw new HttpException(
        error.response?.data?.message || 'Error creating follow-up',
        error.response?.status || 500,
      );
    }
  }

  async updateFollowUp(
    headers: Record<string, string>,
    followUpId: string,
    dto: any,
  ) {
    try {
      const response = await firstValueFrom(
        this.http.put(`/api/core/follow-ups/${followUpId}`, dto, { headers }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to update follow-up: ${error.message}`);
      throw new HttpException(
        `Follow-up update error: ${error.message}`,
        error.response?.status || 500,
      );
    }
  }

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

  async getCustomerTimeline(
    headers: Record<string, string>,
    customerId: string,
    source?: string,
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
   * Send WhatsApp message (Original HTTP method, kept for controllers)
   */
  async sendWhatsAppMessage(
    headers: Record<string, string>,
    data: {
      customerId: string;
      phone: string;
      message: string;
      messageType?: 'TEXT' | 'TEMPLATE';
      channel?: string;
      source?: string;
      sourceId?: string;
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
   * Send Transactional WhatsApp Message (Bypasses HTTP/Auth)
   * Uses WhatsAppSender service directly.
   * Requires: ACTIVE template for the given feature in this tenant.
   */
  async sendTransactionalMessage(
    tenantId: string,
    phone: string,
    feature: string, // e.g., 'INVOICE_CREATED', 'JOB_COMPLETED'
    templateParams: string[],
  ) {
    try {
      this.logger.warn(
        `Transactional WhatsApp not fully implemented yet - requires Template Lookup. Logged: ${feature} to ${phone}`,
      );
      return { success: false, reason: 'Template lookup not implemented' };
    } catch (error) {
      this.logger.error(
        `Failed to send transactional WhatsApp: ${error.message}`,
      );
      return { success: false, error: error.message };
    }
  }

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
  // 5️⃣ HEALTH CHECK
  // ========================

  async healthCheck(headers: Record<string, string>) {
    try {
      // Just verify we can reach the core API area (e.g. hello or specialized health)
      // Using dashboard metrics with no data as a lightweight check, or use dedicated health if exists.
      // Assuming /api/core/health exists or we can ping root.
      // For now, simple ping.
      const response = await firstValueFrom(
        this.http.get('/api/core/health', { headers }),
      );
      // If 404, we might assume core is reachable but route missing.
      // But let's assume valid route.
      return true;
    } catch (e) {
      return false;
    }
  }

  buildAuthHeaders(jwtToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    };
  }
}
