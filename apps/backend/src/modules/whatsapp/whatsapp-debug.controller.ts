import { Controller, Get, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { PlanRulesService } from '../../core/billing/plan-rules.service';

interface CheckItem {
  name: string;
  status: 'PASS' | 'FAIL';
  value: any;
}

@Controller('whatsapp/debug')
@UseGuards(JwtAuthGuard)
export class WhatsAppDebugController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planRulesService: PlanRulesService,
  ) {}

  @Get('status/:tenantId')
  async getStatus(@Param('tenantId') tenantId: string) {
    // 1. Fetch Tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      // Select only scalar fields or known relations
      select: { id: true, name: true, whatsappEnabled: true, businessType: true }, 
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // 2. Fetch Settings
    const setting = await this.prisma.whatsAppSetting.findUnique({
      where: { tenantId },
    });

    // 3. Fetch Plan Rules
    const rules = await this.planRulesService.getPlanRulesForTenant(tenantId);
    
    // 4. Check Member Count
    const memberCount = await this.prisma.member.count({
      where: { tenantId, isActive: true }, // Using 'isActive' instead of 'status' if status field differs
    });

    // 5. Simulate Check Logic (Mirroring WhatsAppSender)
    const checks: CheckItem[] = [];
    let isBlocked = false;
    let blockReason: string | null = null;

    // Check 1: Settings (Explicit Disable Only)
    // Permissive check: Block ONLY if explicitly false
    if (setting && setting.enabled === false) {
      isBlocked = true;
      blockReason = 'WhatsApp disabled in settings (explicit)';
      checks.push({ name: 'Settings (Explicit)', status: 'FAIL', value: false });
    } else {
      checks.push({ name: 'Settings (Explicit)', status: 'PASS', value: true });
    }

    // Check 2: Plan Enabled
    if (!rules) {
      isBlocked = true;
      blockReason = 'Plan Rules not found (No Active Subscription)';
      checks.push({ name: 'Plan Enabled', status: 'FAIL', value: 'NULL' });
    } else if (!rules.enabled) {
      if (!isBlocked) {
        isBlocked = true;
        blockReason = 'WhatsApp disabled by Plan';
      }
      checks.push({ name: 'Plan Enabled', status: 'FAIL', value: false });
    } else {
      checks.push({ name: 'Plan Enabled', status: 'PASS', value: true });
    }

    // Check 3: Member Limit
    // Handle null rules case first
    const maxMembers = rules ? rules.maxMembers : 0;
    
    const isLimitExceeded = rules && rules.maxMembers > 0 && memberCount > rules.maxMembers;
    
    if (isLimitExceeded) {
       if (!isBlocked) {
         isBlocked = true;
         // rules is guaranteed not null here because of check above
         blockReason = `Member Limit Exceeded (${memberCount} > ${maxMembers})`;
       }
       checks.push({ name: 'Member Limit', status: 'FAIL', value: `Exceeded ${maxMembers}` });
    } else {
       checks.push({ name: 'Member Limit', status: 'PASS', value: `OK (${memberCount} <= ${maxMembers > 0 ? maxMembers : 'Unlimited'})` });
    }

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        whatsappEnabledField: tenant.whatsappEnabled,
      },
      setting: setting ? { enabled: setting.enabled } : 'NOT_FOUND (Defaults to Enabled)',
      planRules: rules,
      memberCount,
      finalVerdict: {
        canSend: !isBlocked,
        blockReason,
      },
      checks,
    };
  }


  @Get('templates/:tenantId')
  async getDebugTemplates(@Param('tenantId') tenantId: string) {
    // 1. Fetch Tenant to find Module Type
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, businessType: true }, // businessType often maps to 'GYM' or 'MOBILESHOP' defaults
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // Determine module type. Default to GYM if not explicit or if businessType matches known values
    // Note: In some setups, businessType might be 'GYM' directly.
    // If not found, we can try to find ANY active template to guess, or default to 'GYM'
    let moduleType = 'GYM';

    // 2. Fetch Active Templates
    const templates = await this.prisma.whatsAppTemplate.findMany({
      where: { 
        moduleType, // TODO: Improve module detection if needed
        status: 'ACTIVE' 
      },
      orderBy: { updatedAt: 'desc' },
    });

    return templates;
  }
}
