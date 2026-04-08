import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

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
  upgrade?: string;
}

/**
 * 🧱 MOBIBIX OPEN CORE STUB: AI Intelligence Engine
 * 
 * This client is a functional stub for the MobiBix Cloud AI Engine.
 * It provides a standardized interface for core-triggered AI tasks while
 * redirecting intelligence-heavy operations to the cloud monetization layer.
 */
@Injectable()
export class AiCoreClient {
  private readonly logger = new Logger('AiCoreClient');

  async sendTask(dto: any): Promise<AiTaskResult> {
    const requestId = randomUUID();
    
    console.log('\n--- [MobiBix Core] AI Intelligence Triggered ---');
    console.log(`🤖 Role: ${dto.agentRole}`);
    console.log(`💬 Message: ${dto.message.substring(0, 100)}...`);
    console.log('--- [MobiBix Core] AI Feature available in Cloud v1 ---\n');

    return {
      requestId,
      sessionId: dto.sessionId || randomUUID(),
      agentRole: dto.agentRole,
      response: "MobiBix Core: Intelligence features are handled by the Cloud Integration Layer. Please upgrade to MobiBix Cloud for advanced AI assistance, shop diagnostics, and automated workflows.",
      toolsUsed: [],
      tokenUsage: {
        input: 0,
        output: 0,
        total: 0,
        source: 'stub-v1'
      },
      latencyMs: 10,
      upgrade: 'https://mobibix.in/upgrade?feature=ai_engine'
    };
  }
}
