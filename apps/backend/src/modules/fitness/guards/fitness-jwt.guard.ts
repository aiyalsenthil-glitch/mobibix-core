import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class FitnessJwtGuard extends AuthGuard('fitness-jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<T>(err: any, user: T): T {
    if (err || !user) {
      throw err || new UnauthorizedException('Fitness authentication required');
    }
    return user;
  }
}
