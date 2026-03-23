import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class LinkingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // 1. Distributor sends invite to an existing ERP tenant
  //    Identified by phone, email, or tenantCode
  // ─────────────────────────────────────────────
  async sendInvite(distributorId: string, dto: { phone?: string; email?: string; tenantCode?: string }) {
    if (!dto.phone && !dto.email && !dto.tenantCode) {
      throw new BadRequestException('Provide at least one of: phone, email, tenantCode');
    }

    // Try to resolve the target tenant
    let targetTenantId: string | null = null;
    if (dto.tenantCode) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { code: dto.tenantCode },
        select: { id: true },
      });
      if (tenant) targetTenantId = tenant.id;
    }

    // Prevent duplicate active invite
    const existing = await this.prisma.distLinkInvite.findFirst({
      where: {
        distributorId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
        OR: [
          dto.phone ? { targetPhone: dto.phone } : {},
          dto.email ? { targetEmail: dto.email } : {},
          targetTenantId ? { targetTenantId } : {},
        ],
      },
    });
    if (existing) throw new ConflictException('An active invite already exists for this retailer');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    return this.prisma.distLinkInvite.create({
      data: {
        distributorId,
        targetPhone: dto.phone ?? null,
        targetEmail: dto.email ?? null,
        targetTenantId,
        status: 'PENDING',
        expiresAt,
      },
    });
  }

  // ─────────────────────────────────────────────
  // 2. ERP user accepts or rejects a pending invite
  // ─────────────────────────────────────────────
  async respondToInvite(inviteId: string, tenantId: string, accept: boolean) {
    const invite = await this.prisma.distLinkInvite.findUnique({ where: { id: inviteId } });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.status !== 'PENDING') throw new BadRequestException('Invite is no longer pending');
    if (invite.expiresAt < new Date()) {
      await this.prisma.distLinkInvite.update({ where: { id: inviteId }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('Invite has expired');
    }

    if (!accept) {
      await this.prisma.distLinkInvite.update({ where: { id: inviteId }, data: { status: 'REJECTED' } });
      return { accepted: false };
    }

    // Check not already linked
    const existing = await this.prisma.distDistributorRetailer.findUnique({
      where: { distributorId_retailerId: { distributorId: invite.distributorId, retailerId: tenantId } },
    });
    if (existing) {
      await this.prisma.distLinkInvite.update({ where: { id: inviteId }, data: { status: 'ACCEPTED' } });
      return { accepted: true, alreadyLinked: true };
    }

    const [link] = await this.prisma.$transaction([
      this.prisma.distDistributorRetailer.create({
        data: {
          distributorId: invite.distributorId,
          retailerId: tenantId,
          status: 'ACTIVE',
          linkedVia: 'MANUAL_DIST',
        },
      }),
      this.prisma.distLinkInvite.update({ where: { id: inviteId }, data: { status: 'ACCEPTED' } }),
    ]);

    return { accepted: true, link };
  }

  // ─────────────────────────────────────────────
  // 3. ERP user self-links to a distributor by entering their referral code
  //    (post-signup — no commission triggered)
  // ─────────────────────────────────────────────
  async selfLink(tenantId: string, referralCode: string) {
    const dist = await this.prisma.distDistributor.findUnique({
      where: { referralCode: referralCode.toUpperCase() },
      select: { id: true, name: true, isActive: true },
    });
    if (!dist || !dist.isActive) throw new NotFoundException('Distributor not found for that code');

    const existing = await this.prisma.distDistributorRetailer.findUnique({
      where: { distributorId_retailerId: { distributorId: dist.id, retailerId: tenantId } },
    });
    if (existing) {
      if (existing.status === 'ACTIVE') throw new ConflictException('Already linked to this distributor');
      // Re-activate if inactive
      return this.prisma.distDistributorRetailer.update({
        where: { distributorId_retailerId: { distributorId: dist.id, retailerId: tenantId } },
        data: { status: 'ACTIVE' },
      });
    }

    return this.prisma.distDistributorRetailer.create({
      data: {
        distributorId: dist.id,
        retailerId: tenantId,
        status: 'ACTIVE',
        linkedVia: 'SELF_LINK',
        // No commission — self-linked post-signup
        firstCommissionPct: 0,
        recurringCommissionPct: 0,
      },
    });
  }

  // ─────────────────────────────────────────────
  // 4. List invites sent by a distributor
  // ─────────────────────────────────────────────
  async listSentInvites(distributorId: string) {
    return this.prisma.distLinkInvite.findMany({
      where: { distributorId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ─────────────────────────────────────────────
  // 5. List all active distributor links for an ERP tenant
  // ─────────────────────────────────────────────
  async listMyDistributors(tenantId: string) {
    return this.prisma.distDistributorRetailer.findMany({
      where: { retailerId: tenantId, status: 'ACTIVE' },
      include: {
        distributor: { select: { id: true, name: true, referralCode: true, phone: true } },
        stockVisibility: { select: { allowAllProducts: true, allowedCategories: true, allowedBrands: true } },
      },
      orderBy: { linkedAt: 'asc' },
    });
  }

  // ─────────────────────────────────────────────
  // 6. List pending invites for an ERP tenant (via their phone/email lookup)
  // ─────────────────────────────────────────────
  async listPendingInvitesForTenant(tenantId: string) {
    // Look up tenant contact info
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { contactPhone: true, contactEmail: true, id: true },
    });
    if (!tenant) return [];

    const orClauses: any[] = [{ targetTenantId: tenantId }];
    if (tenant.contactPhone) orClauses.push({ targetPhone: tenant.contactPhone });
    if (tenant.contactEmail) orClauses.push({ targetEmail: tenant.contactEmail });

    return this.prisma.distLinkInvite.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { gt: new Date() },
        OR: orClauses,
      },
      include: {
        distributor: { select: { name: true, referralCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
