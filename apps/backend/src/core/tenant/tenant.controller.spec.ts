import { Test, TestingModule } from '@nestjs/testing';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsageSnapshotService } from '../analytics/usage-snapshot.service';
import { TenantStatusGuard } from './guards/tenant-status.guard';
import { JwtService } from '@nestjs/jwt';
import { PermissionService } from '../permissions/permissions.service';
import { CacheService } from '../cache/cache.service';

describe('TenantController', () => {
  let controller: TenantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantController],
      providers: [
        {
          provide: TenantService,
          useValue: {
            getTenant: jest.fn(),
            updateTenant: jest.fn(),
            listTenants: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            usageSnapshot: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: UsageSnapshotService,
          useValue: {
            captureSnapshot: jest.fn(),
          },
        },
        {
          provide: TenantStatusGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: PermissionService,
          useValue: { hasPermission: jest.fn().mockResolvedValue(true) },
        },
        {
          provide: CacheService,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<TenantController>(TenantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
