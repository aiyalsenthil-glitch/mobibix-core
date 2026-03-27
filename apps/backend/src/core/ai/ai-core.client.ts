import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface AiTaskRequest {
  tenantJwt: string;
  agentRole: string;
  message: string;
  sessionId?: string;
  language?: string;
  context?: Record<string, unknown>;
  modelConfig?: {
    provider: string;
    baseUrl: string | null;
    apiKey: string | null;
    model: string;
  };
}

export interface AiTaskResult {
  requestId: string;
  sessionId: string;
  agentRole: string;
  response: string;
  toolsUsed: string[];
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    source: string;
  };
  latencyMs: number;
}

@Injectable()
export class AiCoreClient {
  private readonly logger = new Logger(AiCoreClient.name);
  private readonly aiCoreUrl: string;
  private readonly internalToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.aiCoreUrl = this.configService.get<string>('AI_CORE_URL') || 'http://localhost_REPLACED:3002';
    const token = this.configService.get<string>('INTERNAL_API_KEY');
    if (!token && process.env.NODE_ENV === 'production') {
      this.logger.warn('INTERNAL_API_KEY is not set — AI Core requests will fail in production');
    }
    this.internalToken = token || 'dev-internal-key';
  }

  async sendTask(dto: AiTaskRequest): Promise<AiTaskResult> {
    const requestId = randomUUID();
    this.logger.debug(`Sending task ${requestId} to ai-core`);

    // Fetch dynamic AI Config globally configured via Admin Panel
    const config = await this.prisma.systemAiConfig.findFirst();
    if (config && config.isActive) {
      dto.modelConfig = {
        provider: config.provider,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.defaultModel,
      };
    } else if (config && !config.isActive) {
      throw new HttpException(
        'AI Services are currently disabled across the platform by the administrator.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<AiTaskResult>(
          `${this.aiCoreUrl}/task`,
          dto,
          {
            headers: {
              'x-internal-token': this.internalToken,
              'x-request-id': requestId,
            },
          }
        ).pipe(
          timeout(20000), // 20s timeout for LLM reasoning
          catchError((error) => {
            this.logger.error(`AI Core request failed: ${error.message}`, error.stack);
            throw new HttpException(
              error.response?.data?.message || 'AI Service Unavailable',
              error.response?.status || HttpStatus.SERVICE_UNAVAILABLE,
            );
          }),
        ),
      );

      return data;
    } catch (error) {
      this.logger.error(`Failed to execute AI task: ${error.message}`);
      throw error;
    }
  }
}
