import { Module, Global } from '@nestjs/common';
import { PermissionService } from './permissions.service';
import { ActionDispatcherService } from './action-dispatcher.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { BranchAccessGuard } from './guards/branch-access.guard';
import { GranularPermissionGuard } from './guards/granular-permission.guard';
import { RolesController } from './roles.controller';
import { ApprovalsController } from './approvals.controller';

@Global()
@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [RolesController, ApprovalsController],
  providers: [
    PermissionService, 
    ActionDispatcherService,
    BranchAccessGuard,
    GranularPermissionGuard
  ],
  exports: [
    PermissionService, 
    ActionDispatcherService,
    BranchAccessGuard,
    GranularPermissionGuard
  ],
})
export class PermissionsModule {}
