import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ThrottlerExceptionFilter.name);

  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status = HttpStatus.TOO_MANY_REQUESTS;
    const message = exception.message || 'Rate limit exceeded';

    // Log rate limit violations
    this.logger.warn(
      `Rate limit exceeded: ${request.method} ${request.url} | ` +
        `IP: ${request.ip} | User: ${request.user?.userId || 'anonymous'}`,
    );

    response.status(status).json({
      statusCode: status,
      message,
      error: 'Too Many Requests',
      retryAfter: 60, // Retry after 60 seconds
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
