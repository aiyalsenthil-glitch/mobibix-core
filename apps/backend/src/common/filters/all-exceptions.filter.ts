import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

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

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // 🛡️ Enhanced Logging (Server-side ONLY)
    this.logger.error(
      `❌ [${request.method}] ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    // 🛡️ Special handling for Prisma/Database errors to keep them clean
    let errorMessage = typeof message === 'string' ? message : (message as any).message || 'Unknown error';
    
    // Check if it's a Prisma error (often starts with P20 or similar in NestJS wrappers)
    if (exception && (exception as any).code?.startsWith('P')) {
       this.logger.warn(`Prisma Error Detected: ${(exception as any).code}`);
       // Hide technical db details in production-style response
       if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
         errorMessage = 'A database error occurred. Please try again later.';
       }
    }

    // 🚀 Standardized Sanitized Response
    response.status(status).json({
      statusCode: status,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
      // 🛡️ NEVER include: stack, fullError, or internal details here
    });
  }
}
