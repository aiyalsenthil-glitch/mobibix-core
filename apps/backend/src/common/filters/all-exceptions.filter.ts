import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode, ERROR_MESSAGES } from '../enums/error-codes.enum';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = '';
    let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
    let errors: Record<string, string[]> | undefined = undefined;

    // 🛡️ Enhanced Logging (Server-side ONLY)
    // Suppress noisy 401s from health probes / bots (Go-http-client, etc.)
    const userAgent = request.headers['user-agent'] || '';
    const isAuthError = status === 401 || status === 403;
    const isProbe =
      userAgent.includes('Go-http-client') ||
      userAgent.includes('curl') ||
      userAgent.includes('bot');

    if (isAuthError && isProbe) {
      // Suppress - these are expected unauthenticated probe requests
    } else if (isAuthError) {
      // Auth errors from real clients - just warn, not error, to reduce noise
      this.logger.warn(`[${status}] [${request.method}] ${request.url}`);
    } else {
      this.logger.error(
        `[ERR] [${request.method}] ${request.url} - ${status}`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    }

    // 🚨 Sentry Reporting (Critical Errors Only)
    if (status >= 500) {
      Sentry.captureException(exception);
    }

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      // Handle validation errors from class-validator
      if (
        status === HttpStatus.BAD_REQUEST &&
        typeof exceptionResponse === 'object'
      ) {
        const resp = exceptionResponse as any;
        if (
          resp.message?.includes('validation') ||
          Array.isArray(resp.message)
        ) {
          errorCode = ErrorCode.VALIDATION_FAILED;
          message = ERROR_MESSAGES[errorCode];
          // Capture validation errors for frontend
          if (Array.isArray(resp.message)) {
            errors = resp.message.reduce(
              (acc: Record<string, string[]>, err: any) => {
                const field = err.property || 'unknown';
                acc[field] = Object.values(err.constraints || {});
                return acc;
              },
              {},
            );
          }
        } else {
          message = resp.message || 'Bad request';
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || 'An error occurred';
      }

      // Extract error code if included in exception
      if (exception instanceof HttpException) {
        const resp = exception.getResponse() as any;
        if (resp.errorCode) {
          errorCode = resp.errorCode;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message || 'Internal server error';
    } else {
      message = 'An unexpected error occurred';
    }

    // 🛡️ Use categorized message if available, otherwise use provided message
    if (!message) {
      message = ERROR_MESSAGES[errorCode];
    }

    // 🛡️ Special handling for Prisma/Database errors
    if (exception && (exception as any).code?.startsWith('P')) {
      this.logger.warn(`Prisma Error Detected: ${(exception as any).code}`);
      errorCode = ErrorCode.DATABASE_ERROR;
      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        message = ERROR_MESSAGES[errorCode];
      }
    }

    // 🚀 Standardized Error Response
    const errorResponse: any = {
      success: false,
      statusCode: status,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      // 🛡️ NEVER include: stack, fullError, or internal details here
    };

    // Include validation errors for client-side handling
    if (errors) {
      errorResponse.errors = errors;
    }

    response.status(status).json(errorResponse);
  }
}
