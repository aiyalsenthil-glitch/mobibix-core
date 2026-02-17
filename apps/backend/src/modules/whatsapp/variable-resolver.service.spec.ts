import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppVariableResolver, VariableResolutionContext } from './variable-resolver.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppModule } from './variable-registry';

describe('WhatsAppVariableResolver Dynamic Links', () => {
  let resolver: WhatsAppVariableResolver;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppVariableResolver,
        {
          provide: PrismaService,
          useValue: {
            jobCard: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    resolver = module.get<WhatsAppVariableResolver>(WhatsAppVariableResolver);
    prisma = module.get<PrismaService>(PrismaService);
    
    process.env.FRONTEND_URL = 'https://test.mobibix.in';
  });

  describe('Invoice Links', () => {
    it('should resolve invoiceLink correctly', async () => {
      const context: VariableResolutionContext = {
        module: WhatsAppModule.MOBILE_SHOP,
        tenantId: 'tenant-1',
        invoiceId: 'inv-123',
      };

      const result = await (resolver as any).resolveComputedVariable(
        { key: 'invoiceLink' },
        context
      );

      expect(result).toBe('https://test.mobibix.in/print/invoice/inv-123');
    });

    it('should resolve invoice_link (legacy) correctly', async () => {
      const context: VariableResolutionContext = {
        module: WhatsAppModule.MOBILE_SHOP,
        tenantId: 'tenant-1',
        invoiceId: 'inv-123',
      };

      const result = await (resolver as any).resolveComputedVariable(
        { key: 'invoice_link' },
        context
      );

      expect(result).toBe('https://test.mobibix.in/print/invoice/inv-123');
    });
  });

  describe('Job Tracking Links', () => {
    it('should resolve jobTrackingLink correctly', async () => {
      (prisma.jobCard.findUnique as jest.Mock).mockResolvedValue({
        publicToken: 'token-456',
      });

      const context: VariableResolutionContext = {
        module: WhatsAppModule.MOBILE_SHOP,
        tenantId: 'tenant-1',
        jobCardId: 'job-123',
      };

      const result = await (resolver as any).resolveComputedVariable(
        { key: 'jobTrackingLink' },
        context
      );

      expect(prisma.jobCard.findUnique).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        select: { publicToken: true },
      });
      expect(result).toBe('https://test.mobibix.in/track/token-456');
    });

    it('should resolve job_tracking_link (legacy) correctly', async () => {
      (prisma.jobCard.findUnique as jest.Mock).mockResolvedValue({
        publicToken: 'token-456',
      });

      const context: VariableResolutionContext = {
        module: WhatsAppModule.MOBILE_SHOP,
        tenantId: 'tenant-1',
        jobCardId: 'job-123',
      };

      const result = await (resolver as any).resolveComputedVariable(
        { key: 'job_tracking_link' },
        context
      );

      expect(result).toBe('https://test.mobibix.in/track/token-456');
    });
  });
});
