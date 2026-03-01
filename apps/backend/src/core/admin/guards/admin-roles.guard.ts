import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole, ModuleType } from '@prisma/client';
import {
  ADMIN_ROLES_KEY,
  ADMIN_PRODUCT_KEY,
} from '../decorators/admin.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredProduct = this.reflector.getAllAndOverride<ModuleType>(
      ADMIN_PRODUCT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles or product scope are specified, allow by default (as they might have basic admin JWT)
    if (!requiredRoles && !requiredProduct) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    // Assuming user context has userId from standard JwtAuthGuard
    if (!user || !user.userId) {
      throw new ForbiddenException('No active user session');
    }

    const adminUser = await this.prisma.adminUser.findUnique({
      where: { userId: user.userId },
    });

    if (!adminUser) {
      throw new ForbiddenException('User is not an administrator');
    }

    // Role-based check
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(adminUser.role)) {
        throw new ForbiddenException(
          `Requires one of these roles: ${requiredRoles.join(', ')}`,
        );
      }
    }

    // Product-scope check
    // SUPER_ADMIN has access to all products implicitly
    if (requiredProduct && adminUser.role !== 'SUPER_ADMIN') {
      if (adminUser.productScope !== requiredProduct) {
        throw new ForbiddenException(
          `Not authorized to manage ${requiredProduct}`,
        );
      }
    }

    // Attach adminUser details to request for downstream usage
    const request = context.switchToHttp().getRequest();
    request.adminUser = adminUser;

    return true;
  }
}
