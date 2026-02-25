import { Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(SentryFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const httpStatus =
      exception instanceof HttpException ? exception.getStatus() : 500;

    // Only report 500s or non-HTTP errors to Sentry
    if (httpStatus >= 500) {
      this.logger.error('Critical error captured by Sentry', exception);
      Sentry.captureException(exception);
    }

    super.catch(exception, host);
  }
}
