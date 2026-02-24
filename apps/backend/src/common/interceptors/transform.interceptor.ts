import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  timestamp: string;
  path: string;
}

/**
 * Standardizes all successful API responses
 * Wraps results in: { success: true, data: ..., timestamp: ..., path: ... }
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => {
        // 🛡️ Skip transformation for core auth and legacy session routes
        // These expect specific shapes (e.g. CurrentUserResponse)
        const path = request.originalUrl || request.url || request.path || '';
        const skipRoutes = [
          'auth',
          'users/me',
          'users/tenants',
          'tenant',
          'mobileshop',
          'mobibix',
          'health',
        ];

        // 🛡️ Robust matching: check if path contains any skip segment as a full word/segment
        // Matches /api/auth/, /api/auth, /auth/, etc.
        const isSkipRoute = skipRoutes.some((route) => {
          const normalizedPath = path.toLowerCase();
          const normalizedRoute = route.toLowerCase();
          return (
            normalizedPath.includes(`/${normalizedRoute}/`) ||
            normalizedPath.endsWith(`/${normalizedRoute}`) ||
            normalizedPath.includes(`/${normalizedRoute}?`)
          );
        });

        // 🔍 DEBUG LOG
        if (isSkipRoute || path.includes('shops')) {
           console.log(`[TransformInterceptor] Path: ${path}, Skip: ${isSkipRoute}`);
        }

        if (isSkipRoute) {
          return data;
        }

        // 🛡️ Skip transformation if:
        // 1. Data is already wrapped or null (empty responses)
        // 2. Data is an error response (has status: 'error')
        if (
          data === null ||
          data === undefined ||
          (typeof data === 'object' &&
            ((data.success !== undefined && data.data !== undefined) ||
             (data.status === 'error')))
        ) {
          return data;
        }

        // 2. Data is a stream or buffer (e.g. PDF Download)
        if (
          data instanceof Buffer ||
          (data && typeof data.pipe === 'function')
        ) {
          return data;
        }

        return {
          success: true,
          data: data ?? null,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
