import { Test, TestingModule } from '@nestjs/testing';
import { TenantService } from './tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../billing/plans/plans.service';
import { SubscriptionsService } from '../billing/subscriptions/subscriptions.service';
import { JwtService } from '@nestjs/jwt';
import { PlanRulesService } from '../billing/plan-rules.service';
import { EmailService } from '../../common/email/email.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PartnersService } from '../../modules/partners/partners.service';
import { DocumentNumberService } from '../../common/services/document-number.service';

describe('TenantService', () => {
  let service: TenantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: PlansService,
          useValue: { getPlan: jest.fn() },
        },
        {
          provide: SubscriptionsService,
          useValue: { getCurrentActiveSubscription: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn() },
        },
        {
          provide: PlanRulesService,
          useValue: { getPlanRulesForTenant: jest.fn() },
        },
        {
          provide: EmailService,
          useValue: { sendEmail: jest.fn() },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: PartnersService,
          useValue: { findByReferralCode: jest.fn() },
        },
        {
          provide: DocumentNumberService,
          useValue: { initializeShopDocumentSettings: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
