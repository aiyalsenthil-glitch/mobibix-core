import { Module } from '@nestjs/common';
import { PermissionService } from './permissions.service';
import { ActionDispatcherService } from './action-dispatcher.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { BranchAccessGuard } from './guards/branch-access.guard';
import { GranularPermissionGuard } from './guards/granular-permission.guard';

@Module({
  imports: [PrismaModule, CacheModule],
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
