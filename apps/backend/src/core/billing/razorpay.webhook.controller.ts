import {
  Controller,
  Post,
  Headers,
  Body,
  BadRequestException,
  Logger,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RazorpayService } from './REMOVED_PAYMENT_INFRA.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Public } from '../auth/decorators/public.decorator';

@Controller(['billing/webhook/REMOVED_PAYMENT_INFRA', 'payments/webhook'])
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    private readonly REMOVED_PAYMENT_INFRAService: RazorpayService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue('REMOVED_PAYMENT_INFRA-webhooks') private readonly webhookQueue: Queue,
  ) {}

  @Public()
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
    const eventId = body.headers?.['x-REMOVED_PAYMENT_INFRA-event-id'] || body.id;
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
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      this.logger.error(
        JSON.stringify({
          ...logData,
          status: 'QUEUE_FAILED',
          durationMs,
          error: err.message,
        }),
      );

      if (eventId) {
        await this.prisma.webhookEvent
          .updateMany({
            where: { provider: 'RAZORPAY', referenceId: eventId },
            data: { status: 'FAILED', error: err.message },
          })
          .catch((updateErr) =>
            this.logger.error('Failed to log error status', updateErr),
          );
      }

      return { status: 'error', message: err.message };
    }

    return { status: 'ok' };
  }
}
