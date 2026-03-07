import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { randomUUID } from 'crypto';

export interface AiTaskRequest {
  tenantJwt: string;
  agentRole: string;
  message: string;
  sessionId?: string;
  language?: string;
  context?: Record<string, unknown>;
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
  ) {
    this.aiCoreUrl = this.configService.get<string>('AI_CORE_URL') || 'http://localhost_REPLACED:3002';
    // Match INTERNAL_API_KEY from AI Core config
    this.internalToken = this.configService.get<string>('INTERNAL_API_KEY') || 'dev-internal-key';
  }

  async sendTask(dto: AiTaskRequest): Promise<AiTaskResult> {
    const requestId = randomUUID();
    this.logger.debug(`Sending task ${requestId} to ai-core`);

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
