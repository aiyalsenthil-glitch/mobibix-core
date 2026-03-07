import { Controller, Post, Body, Req, UseGuards, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { AiCoreClient, AiTaskRequest } from './ai-core.client';
import { AiQuotaService } from './ai-quota.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { ModuleType } from '@prisma/client';
import { SkipSubscriptionCheck } from '../auth/decorators/skip-subscription-check.decorator';
import { PrismaService } from '../prisma/prisma.service';

export class AiChatDto {
  message: string;
  sessionId?: string;
  module: ModuleType;
  language?: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
// AI feature relies on its own separate token system, so we bypass strict plan guard here 
// and do custom quota assertions inside the endpoint.
@SkipSubscriptionCheck()
export class AiChatController {
  constructor(
    private readonly aiClient: AiCoreClient,
    private readonly quotaService: AiQuotaService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('chat')
  async handleChat(
    @Req() req: any,
    @Body() dto: AiChatDto,
    @Headers('authorization') authHeader: string,
  ) {
    const { tenantId } = req.user;
    
    // We enforce tenant logic securely via the token, but need the raw JWT for ai-core API
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HttpException('Missing authorization token', HttpStatus.UNAUTHORIZED);
    }
    const tenantJwt = authHeader.split(' ')[1];

    if (!dto.message?.trim()) {
      throw new HttpException('Message cannot be empty', HttpStatus.BAD_REQUEST);
    }

    if (!dto.module) {
      throw new HttpException('Module is required', HttpStatus.BAD_REQUEST);
    }

    // 1. Quota Pre-check (throws if limits exceeded or no AI plan)
    await this.quotaService.assertQuota(tenantId, dto.module);
    
    // 2. Fetch active language preference if none sent
    let language = dto.language;
    if (!language) {
      const dbSettings = await this.prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { tenantId: true }, // Add user preference if implemented, proxy uses AI core defaults
      });
      language = 'ENGLISH'; // Fallback
    }

    // 3. Delegate to AI Core Agent Loop
    const payload: AiTaskRequest = {
      tenantJwt,
      agentRole: 'UTILITY', // Phase 1 uses general agent
      message: dto.message,
      sessionId: dto.sessionId,
      language,
    };

    const aiResponse = await this.aiClient.sendTask(payload);

    // 4. Record Token Consumption Atomic
    // Note: aiResponse.tokenUsage is emitted by ai-core Llama
    if (aiResponse.tokenUsage?.total > 0) {
      await this.quotaService.recordUsage(
        tenantId,
        dto.module,
        aiResponse.tokenUsage,
        'chat'
      );
    }

    return aiResponse;
  }
}
