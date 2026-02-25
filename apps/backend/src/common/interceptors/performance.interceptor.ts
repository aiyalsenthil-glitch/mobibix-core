import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Performance logging interceptor
 * Logs response time for each request and warns on slow queries
 *
 * Apply globally in main.ts:
 * app.useGlobalInterceptors(new PerformanceInterceptor());
 *
 * Or per-controller:
 * @UseInterceptors(PerformanceInterceptor)
 * export class MembersController {}
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');
  private readonly slowThreshold = 1000; // 1 second
  private readonly verySlowThreshold = 3000; // 3 seconds

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const message = `${method} ${url} - ${duration}ms`;

        if (duration > this.verySlowThreshold) {
          // Very slow - ERROR level
          this.logger.error(`[VERY SLOW] ${message}`);
        } else if (duration > this.slowThreshold) {
          // Slow - WARN level
          this.logger.warn(`[SLOW] ${message}`);
        } else {
          // Normal - DEBUG level (only in dev)
          if (process.env.NODE_ENV === 'development') {
            this.logger.debug(`[OK] ${message}`);
          }
        }
      }),
    );
  }
}
