import { Controller, Post, Get, Body, Param, Req, UseGuards } from '@nestjs/common';
import { LinkingService } from './linking.service';
import { DistributorScopeGuard } from '../guards/distributor-scope.guard';
import { SkipSubscriptionCheck } from '../../../core/auth/decorators/skip-subscription-check.decorator';
import { SkipTenant } from '../../../core/auth/decorators/skip-tenant.decorator';

// ── Distributor-facing endpoints (needs distributor context) ──────────────────
@SkipTenant()
@SkipSubscriptionCheck()
@Controller('distributor/linking')
@UseGuards(DistributorScopeGuard)
export class DistributorLinkingController {
  constructor(private readonly linkingService: LinkingService) {}

  /** POST /api/distributor/linking/invite — send invite to an ERP retailer */
  @Post('invite')
  sendInvite(@Req() req: any, @Body() body: { phone?: string; email?: string; tenantCode?: string }) {
    const { distributorId } = req.distributorContext;
    return this.linkingService.sendInvite(distributorId, body);
  }

  /** GET /api/distributor/linking/invites — list all invites sent by this distributor */
  @Get('invites')
  listInvites(@Req() req: any) {
    const { distributorId } = req.distributorContext;
    return this.linkingService.listSentInvites(distributorId);
  }
}

// ── ERP-facing endpoints (standard JWT — tenantId required) ──────────────────
@SkipSubscriptionCheck()
@Controller('retailer/linking')
export class RetailerLinkingController {
  constructor(private readonly linkingService: LinkingService) {}

  /** GET /api/retailer/linking/distributors — list all active distributor links */
  @Get('distributors')
  listDistributors(@Req() req: any) {
    return this.linkingService.listMyDistributors(req.user.tenantId);
  }

  /** GET /api/retailer/linking/invites — see pending invites for this shop */
  @Get('invites')
  listInvites(@Req() req: any) {
    return this.linkingService.listPendingInvitesForTenant(req.user.tenantId);
  }

  /** POST /api/retailer/linking/invites/:id/respond — accept or reject an invite */
  @Post('invites/:id/respond')
  respond(@Req() req: any, @Param('id') inviteId: string, @Body('accept') accept: boolean) {
    return this.linkingService.respondToInvite(inviteId, req.user.tenantId, accept);
  }

  /** POST /api/retailer/linking/self-link — ERP user self-links to a distributor */
  @Post('self-link')
  selfLink(@Req() req: any, @Body('referralCode') referralCode: string) {
    return this.linkingService.selfLink(req.user.tenantId, referralCode);
  }
}
