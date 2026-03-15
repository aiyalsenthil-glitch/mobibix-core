import {
  Controller,
  Post,
  Headers,
  Body,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { RazorpayService } from './REMOVED_PAYMENT_INFRA.service';
import { RazorpayWebhookProcessor } from './REMOVED_PAYMENT_INFRA.webhook.processor';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { Public } from '../auth/decorators/public.decorator';

@Controller(['billing/webhook/REMOVED_PAYMENT_INFRA', 'payments/webhook'])
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    private readonly REMOVED_PAYMENT_INFRAService: RazorpayService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue('REMOVED_PAYMENT_INFRA-webhooks') private readonly webhookQueue: Queue,
    private readonly processor: RazorpayWebhookProcessor,
    @InjectMetric('webhook_queue_fallback_total')
    private readonly fallbackCounter: Counter<string>,
  ) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 req/min per IP
  @Post()
  async handleWebhook(
    @Headers('x-REMOVED_PAYMENT_INFRA-signature') signature: string,
    @Body() body: any,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    const rawSecrets = this.configService.get<string>(
      'RAZORPAY_WEBHOOK_SECRET',
    );
    if (!rawSecrets) {
      this.logger.error('RAZORPAY_WEBHOOK_SECRET is not configured');
      throw new BadRequestException('Webhook configuration error');
    }

    // Support comma-separated secrets for zero-downtime rotation
    const secrets = rawSecrets
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let isValid = false;
    if (!req.rawBody) {
      this.logger.error('Raw body missing - webhook signature validation impossible properly. Ensure express middleware configured!');
      throw new BadRequestException('Webhook payload serialization mapping error natively');
    }
    const bodyBuffer = req.rawBody;
    for (const secret of secrets) {
      if (
        this.REMOVED_PAYMENT_INFRAService.validateWebhookSignature(
          bodyBuffer,
          signature,
          secret,
        )
      ) {
        isValid = true;
        break;
      }
    }

    const event = body.event;
    const eventId = (req.headers['x-REMOVED_PAYMENT_INFRA-event-id'] as string) || body.id;
    const startTime = performance.now();

    const logData = {
      event,
      eventId,
      processor: 'RazorpayWebhookController',
      status: 'RECEIVED',
    };

    if (!isValid) {
      const durationMs = Math.round(performance.now() - startTime);
      this.logger.warn(
        JSON.stringify({
          ...logData,
          status: 'INVALID_SIGNATURE',
          durationMs,
          message: 'Invalid Razorpay Webhook Signature',
        }),
      );
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log(JSON.stringify(logData));

    if (!eventId) {
      this.logger.warn(
        JSON.stringify({
          ...logData,
          status: 'NO_EVENT_ID',
          message: 'Webhook missing event ID, falling back to direct push...',
        }),
      );
    } else {
      try {
        await this.prisma.webhookEvent.create({
          data: {
            provider: 'RAZORPAY',
            eventType: event,
            referenceId: eventId,
            status: 'PROCESSING',
            payload: body.payload || {},
          },
        });
      } catch (err: any) {
        if (err.code === 'P2002') {
          this.logger.log(
            JSON.stringify({
              ...logData,
              status: 'IDEMPOTENT_IGNORE',
              message: 'Already processed',
            }),
          );
          return { status: 'ok', message: 'Already processed' };
        }
        this.logger.error(
          JSON.stringify({
            ...logData,
            status: 'DB_LOCK_FAILED',
            error: err.message,
          }),
        );
      }
    }

    try {
      // Pass the job to BullMQ
      await this.webhookQueue.add(
        'process-webhook',
        {
          event,
          eventId,
          payload: body.payload,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
        },
      );

      const durationMs = Math.round(performance.now() - startTime);
      this.logger.log(
        JSON.stringify({
          ...logData,
          status: 'QUEUED',
          durationMs,
          message: `Enqueued webhook event ${eventId} to BullMQ.`,
        }),
      );
    } catch (queueErr: any) {
      // Redis/BullMQ unavailable — fall back to synchronous processing
      // so Razorpay receives 200 and does not retry unnecessarily.
      this.logger.warn(
        JSON.stringify({
          ...logData,
          status: 'QUEUE_UNAVAILABLE',
          error: queueErr.message,
          message: 'BullMQ enqueue failed — processing synchronously.',
        }),
      );
      this.fallbackCounter.inc({ event });

      try {
        await this.processor.processEvent(event, eventId, body.payload);
        const durationMs = Math.round(performance.now() - startTime);
        this.logger.log(
          JSON.stringify({
            ...logData,
            status: 'SYNC_COMPLETED',
            durationMs,
          }),
        );
      } catch (syncErr: any) {
        const durationMs = Math.round(performance.now() - startTime);
        this.logger.error(
          JSON.stringify({
            ...logData,
            status: 'SYNC_FAILED',
            durationMs,
            error: syncErr.message,
          }),
          syncErr?.stack,
        );
        // Return 500 — Razorpay will retry. Better than silently losing the event.
        throw new InternalServerErrorException('Webhook processing failed');
      }
    }

    return { status: 'ok' };
  }
}
