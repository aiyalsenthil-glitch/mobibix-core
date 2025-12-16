// apps/backend/src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): unknown => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: unknown }>();
    return req.user ?? null;
  },
);
