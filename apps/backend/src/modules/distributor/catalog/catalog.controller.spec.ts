import { Test, TestingModule } from '@nestjs/testing';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { DistributorScopeGuard } from '../guards/distributor-scope.guard';
import { PrismaService } from '../../../core/prisma/prisma.service';

describe('CatalogController', () => {
  let controller: CatalogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        { provide: CatalogService, useValue: {} },
        { provide: DistributorScopeGuard, useValue: { canActivate: () => true } },
        { provide: PrismaService, useValue: {} },
      ],
    })
      .overrideGuard(DistributorScopeGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CatalogController>(CatalogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
