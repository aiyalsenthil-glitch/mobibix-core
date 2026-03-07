import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BaseNotificationPayload } from './notification.types';
import { NotificationOrchestrator } from './notification.orchestrator';

@Injectable()
export class NotificationEventBus {
  private readonly logger = new Logger(NotificationEventBus.name);

  constructor(private readonly orchestrator: NotificationOrchestrator) {}

  // ─── DELETION NOTIFICATIONS ──────────────────────────────────────────

  @OnEvent('tenant.deletion.requested')
  async handleDeletionRequested(payload: { tenantId: string; ownerId: string; scheduledDate: Date; module: 'GYM' | 'MOBILE_SHOP'; reason?: string }) {
    await this.orchestrator.dispatch({
      tenantId: payload.tenantId,
      eventId: 'tenant.deletion.requested',
      moduleType: payload.module,
      userId: payload.ownerId,
      recipient: payload.ownerId, // Orchestrator expands this mapping via userId
      data: {
        referenceId: payload.tenantId,
        scheduledDate: payload.scheduledDate.toDateString(),
        reason: payload.reason,
      },
    });
  }

  @OnEvent('tenant.deletion.pending')
  async handleDeletionPending(payload: { tenantId: string; ownerId: string; scheduledDate: Date; module: 'GYM' | 'MOBILE_SHOP' }) {
    await this.orchestrator.dispatch({
      tenantId: payload.tenantId,
      eventId: 'tenant.deletion.pending',
      moduleType: payload.module,
      userId: payload.ownerId,
      recipient: payload.ownerId,
      data: {
        referenceId: payload.tenantId,
        scheduledDate: payload.scheduledDate.toDateString(),
      },
    });
  }

  // NOTE: 'tenant.deleted' typically means the tenant record is purged. 
  // Depending on how soft delete works, we may or may not have an active record left.
  // We send the email confirming completion.
  @OnEvent('tenant.deleted')
  async handleTenantDeleted(payload: { tenantId: string; ownerId: string; module: 'GYM' | 'MOBILE_SHOP' }) {
    await this.orchestrator.dispatch({
      tenantId: payload.tenantId,
      eventId: 'tenant.deleted',
      moduleType: payload.module,
      userId: payload.ownerId,
      recipient: payload.ownerId,
      data: {
        referenceId: payload.tenantId,
      },
    });
  }

  // ─── SUBSCRIPTION NOTIFICATIONS ──────────────────────────────────────

  @OnEvent('subscription.active')
  async handleSubscriptionActive(payload: { tenantId: string; module: 'GYM' | 'MOBILE_SHOP'; planId: string; expiryDate: Date }) {
    await this.orchestrator.dispatch({
      tenantId: payload.tenantId,
      eventId: 'subscription.active',
      moduleType: payload.module,
      userId: undefined, // Handled via tenant mapping if needed, or mapping to owner
      recipient: payload.tenantId, // Orchestrator can be extended to find owner
      data: {
        referenceId: payload.planId,
        expiryDate: payload.expiryDate.toDateString(),
      },
    });
  }

  @OnEvent('subscription.expired')
  async handleSubscriptionExpired(payload: { tenantId: string; module: 'GYM' | 'MOBILE_SHOP'; reason?: string }) {
    await this.orchestrator.dispatch({
      tenantId: payload.tenantId,
      eventId: 'subscription.expired',
      moduleType: payload.module,
      recipient: payload.tenantId,
      data: {
        reason: payload.reason,
      },
    });
  }
  @OnEvent('subscription.suspended')
  async handleSubscriptionSuspended(payload: { tenantId: string; module: 'GYM' | 'MOBILE_SHOP'; reason?: string }) {
    await this.orchestrator.dispatch({
      tenantId: payload.tenantId,
      eventId: 'subscription.suspended',
      moduleType: payload.module,
      recipient: payload.tenantId,
      data: {
        reason: payload.reason,
      },
    });
  }

  @OnEvent('tenant.welcome')
  async handleTenantWelcome(payload: { tenantId: string; module: 'GYM' | 'MOBILE_SHOP'; userId: string; data?: any }) {
    await this.orchestrator.dispatch({
      tenantId: payload.tenantId,
      eventId: 'tenant.welcome',
      moduleType: payload.module,
      userId: payload.userId,
      recipient: payload.userId,
      data: payload.data || {
        welcome: true,
      },
    });
  }

  @OnEvent('staff.invite.rejected')
  async handleStaffInviteRejected(payload: { tenantId: string; email: string }) {
    await this.orchestrator.dispatch({
      tenantId: payload.tenantId,
      eventId: 'staff.invite.rejected',
      moduleType: 'MOBILE_SHOP', // Defaulting to MOBILE_SHOP for this flow
      recipient: payload.tenantId, // Orchestrator handles finding the OWNER of the tenant
      data: {
        staffEmail: payload.email,
        title: 'Staff Invitation Rejected',
        message: `User with email ${payload.email} has rejected your staff invitation.`,
      },
    });
  }

  // NOTE: Add @OnEvent hooks here as migration phase from EmailListener occurs...
}
