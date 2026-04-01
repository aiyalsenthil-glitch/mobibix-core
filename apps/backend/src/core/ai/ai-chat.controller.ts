import { Controller, Post, Body, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import { AiCoreClient, AiTaskRequest } from './ai-core.client';
import { AiQuotaService } from './ai-quota.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { SkipSubscriptionCheck } from '../auth/decorators/skip-subscription-check.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

export class AiChatDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsEnum(ModuleType)
  module: ModuleType;

  @IsOptional()
  @IsString()
  language?: string;
}

@Controller('ai')
@ModuleScope(ModuleType.CORE)
@ModulePermission('ai')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
// AI feature relies on its own separate token system, so we bypass strict plan guard here 
@SkipSubscriptionCheck()
export class AiChatController {
  constructor(
    private readonly aiClient: AiCoreClient,
    private readonly quotaService: AiQuotaService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  @RequirePermission(PERMISSIONS.CORE.AI.USE)
  @Post('chat')
  async handleChat(
    @Req() req: any,
    @Body() dto: AiChatDto,
  ) {
    const { tenantId, sub: userId } = req.user;

    // Generate a short-lived internal JWT for ai-core tenant context
    const tenantJwt = this.jwtService.sign({ tenantId, userId }, { expiresIn: '2m' });

    if (!dto.message?.trim()) {
      throw new HttpException('Message cannot be empty', HttpStatus.BAD_REQUEST);
    }

    if (!dto.module) {
      throw new HttpException('Module is required', HttpStatus.BAD_REQUEST);
    }

    // 1. Quota Pre-check (throws if limits exceeded or no AI plan)
    await this.quotaService.assertQuota(tenantId, dto.module);
    
    // 2. Normalise language to ai-core expected values (English | Hindi | Tamil)
    const langMap: Record<string, string> = {
      ENGLISH: 'English', HINDI: 'Hindi', TAMIL: 'Tamil',
      english: 'English', hindi: 'Hindi', tamil: 'Tamil',
    };
    const language = langMap[dto.language ?? ''] ?? 'English';

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
