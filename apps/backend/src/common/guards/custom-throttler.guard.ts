import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {

  /**
   * Override to support user-based rate limiting in addition to IP
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // For authenticated requests, track by userId + tenantId
    if (req.user?.userId && req.user?.tenantId) {
      return `user:${req.user.userId}:${req.user.tenantId}`;
    }

    // For unauthenticated requests, track by IP
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  }

  /**
   * Exempt admin users from rate limiting on analytics endpoints
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Skip throttling for admin users on /admin/analytics endpoints
    if (
      user?.role === 'ADMIN' &&
      request.url?.startsWith('/api/admin/analytics')
    ) {
      return true;
    }

    return super.shouldSkip(context);
  }

  /**
   * Custom error handling
   */
  protected throwThrottlingException(context: ExecutionContext): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const tracker = request.user?.userId
      ? `User ${request.user.userId}`
      : `IP ${request.ip}`;

    throw new ThrottlerException(
      `Rate limit exceeded for ${tracker}. Please try again later.`,
    );
  }
}
