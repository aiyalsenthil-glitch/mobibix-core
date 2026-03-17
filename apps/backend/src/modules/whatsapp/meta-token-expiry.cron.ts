import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';

/**
 * Meta Token Expiry Monitor
 *
 * Runs daily at 08:00. Checks WhatsApp numbers using Meta Cloud API
 * that have a user token expiring within 7 days. Sends a single warning
 * email per tenant per expiry window (idempotency key = tokenExpiresAt date).
 *
 * Fix: Tenant owner should replace with a System User token (no expiry).
 * See: https://developers.facebook.com/docs/whatsapp/business-management-api/get-started
 */
@Injectable()
export class MetaTokenExpiryCron {
  private readonly logger = new Logger(MetaTokenExpiryCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Cron('0 8 * * *') // 08:00 daily
  async checkExpiringTokens() {
    const now = new Date();
    const warningWindow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

    // Find META_CLOUD numbers with tokenExpiresAt within 7 days
    const expiring = await this.prisma.whatsAppNumber.findMany({
      where: {
        provider: 'META_CLOUD' as any,
        isEnabled: true,
        tokenExpiresAt: { lte: warningWindow, gte: now },
        tenantId: { not: null },
      } as any,
      select: {
        id: true,
        tenantId: true,
        phoneNumber: true,
        tokenExpiresAt: true,
      },
    });

    if (expiring.length === 0) return;

    this.logger.log(`Meta token expiry check: ${expiring.length} number(s) expiring within 7 days`);

    for (const number of expiring) {
      if (!number.tenantId) continue;
      try {
        await this.notifyTenantOwner(number as { id: string; tenantId: string; phoneNumber: string; tokenExpiresAt: Date | null });
      } catch (err) {
        this.logger.error(`Failed to notify tenant ${number.tenantId}: ${err.message}`);
      }
    }
  }

  private async notifyTenantOwner(number: {
    id: string;
    tenantId: string;
    phoneNumber: string;
    tokenExpiresAt: Date | null;
  }) {
    // Find the tenant owner — join User to get email + fullName
    const ownerRecord = await this.prisma.userTenant.findFirst({
      where: { tenantId: number.tenantId, isSystemOwner: true, deletedAt: null },
      include: { user: { select: { email: true, fullName: true } } },
    });

    const ownerEmail = ownerRecord?.user?.email;
    const ownerName = ownerRecord?.user?.fullName ?? 'there';

    if (!ownerEmail) {
      this.logger.warn(`No owner email for tenant ${number.tenantId} — skipping token expiry alert`);
      return;
    }

    const expiryDate = number.tokenExpiresAt?.toDateString() ?? 'soon';
    const daysLeft = number.tokenExpiresAt
      ? Math.ceil((number.tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    // Use tokenExpiresAt day as idempotency key — send once per expiry date
    const idempotencyKey = `meta_token_expiry:${number.id}:${number.tokenExpiresAt?.toISOString().split('T')[0]}`;

    await this.emailService.send({
      tenantId: number.tenantId,
      recipientType: 'STAFF',
      emailType: 'META_TOKEN_EXPIRY_WARNING',
      referenceId: idempotencyKey,
      module: 'MOBILE_SHOP',
      to: ownerEmail,
      subject: `Action Required: Your WhatsApp connection expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      data: {
        ownerName,
        phoneNumber: number.phoneNumber,
        expiryDate,
        daysLeft,
        reconnectUrl: `${process.env.FRONTEND_URL ?? 'https://app.mobibix.com'}/whatsapp`,
        systemUserGuideUrl: 'https://developers.facebook.com/docs/whatsapp/business-management-api/get-started',
      },
    });

    this.logger.log(
      `Token expiry warning sent to ${ownerEmail} for tenant ${number.tenantId} — expires ${expiryDate}`,
    );
  }
}
