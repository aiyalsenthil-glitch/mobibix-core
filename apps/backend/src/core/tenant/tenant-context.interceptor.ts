import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Scope,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { runWithAsyncContext, setCtx } from '../cls/async-context';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return runWithAsyncContext(() => {
      if (user?.tenantId) {
        setCtx('tenantId', user.tenantId);
      }

      return next.handle();
    });
  }
}
