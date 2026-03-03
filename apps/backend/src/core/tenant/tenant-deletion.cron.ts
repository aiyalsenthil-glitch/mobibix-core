import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantService } from './tenant.service';

@Injectable()
export class TenantDeletionCron {
  private readonly logger = new Logger(TenantDeletionCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * STAGE 2: DELETION REMINDER
   * Runs daily at 02:30 UTC
   * Finds tenants scheduled for deletion exactly 5 days from now
   * and emits 'tenant.deletion.pending' for the final warning.
   */
  @Cron('30 2 * * *')
  async handleDeletionReminders() {
    this.logger.log('Running Stage 2 Deletion Reminders (02:30 UTC)');

    // We want tenants where deletionScheduledAt is less than or equal to 5 days from now
    // But slightly more than 4 days from now, to only pick them up once.
    // However, since it runs daily, we can just say:
    // deletionScheduledAt is between (Now + 4 days, Now + 5 days)
    
    const now = new Date();
    const upperLimit = new Date();
    upperLimit.setDate(now.getDate() + 5);

    const lowerLimit = new Date();
    lowerLimit.setDate(now.getDate() + 4);

    const tenantsToRemind = await this.prisma.tenant.findMany({
      where: {
        status: 'PENDING_DELETION',
        deletionScheduledAt: {
          gt: lowerLimit,
          lte: upperLimit,
        },
      },
      include: {
        userTenants: {
          where: { role: 'OWNER' },
          include: { user: true },
        },
      },
    });

    if (tenantsToRemind.length === 0) {
      this.logger.log('No tenants found for deletion reminder today.');
      return;
    }

    for (const tenant of tenantsToRemind) {
      const owner = tenant.userTenants[0]?.user;
      if (!owner) continue;

      this.logger.log(`Emitting deletion reminder for Tenant ${tenant.id} (${tenant.name})`);
      
      this.eventEmitter.emit('tenant.deletion.pending', {
        tenantId: tenant.id,
        ownerId: owner.id,
        scheduledDate: tenant.deletionScheduledAt,
        module: tenant.tenantType === 'MOBILE_SHOP' ? 'MOBILE_SHOP' : 'GYM',
      });
    }
  }

  /**
   * STAGE 3: HARD DELETION
   * Runs daily at 03:00 UTC
   * Finds tenants scheduled for deletion TODAY or EARLIER
   * Executes deletion protocol and emits 'tenant.deleted'.
   */
  @Cron('0 3 * * *')
  async handleFinalDeletions() {
    this.logger.log('Running Stage 3 Final Deletions (03:00 UTC)');

    const now = new Date();

    const tenantsToDelete = await this.prisma.tenant.findMany({
      where: {
        status: 'PENDING_DELETION',
        deletionScheduledAt: {
          lte: now,
        },
      },
      include: {
        userTenants: {
          where: { role: 'OWNER' },
          include: { user: true },
        },
      },
    });

    if (tenantsToDelete.length === 0) {
      this.logger.log('No tenants found ready for final deletion today.');
      return;
    }

    for (const tenant of tenantsToDelete) {
      const owner = tenant.userTenants[0]?.user;
      if (!owner) continue;

      this.logger.warn(`EXECUTING FINAL DELETION FOR TENANT: ${tenant.id} (${tenant.name})`);

      try {
        // Trigger the internal deletion process (Anonymize or Hard Delete based on GST logic)
        // Note: processDeletionRequest logic was primarily for Admin.
        // We will call the public executeScheduledDeletion logic here
        await this.tenantService.executeScheduledDeletion(tenant.id, owner.id);

        this.eventEmitter.emit('tenant.deleted', {
          tenantId: tenant.id,
          ownerId: owner.id,
          module: tenant.tenantType === 'MOBILE_SHOP' ? 'MOBILE_SHOP' : 'GYM',
        });

      } catch (err) {
        this.logger.error(`Failed to execute deletion for Tenant ${tenant.id}: ${err.message}`, err.stack);
      }
    }
  }
}
