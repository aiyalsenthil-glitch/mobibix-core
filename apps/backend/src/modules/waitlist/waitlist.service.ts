import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JoinWaitlistDto } from './dto/waitlist.dto';
import { EmailService } from '../../common/email/email.service';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  async join(dto: JoinWaitlistDto) {
    try {
      // Check for existing entry
      const existing = await this.prisma.waitlistLead.findUnique({
        where: { phone: dto.phone },
      });

      if (existing) {
        return {
          message: 'You are already on the waitlist!',
          lead: existing,
        };
      }

      // Create new lead
      const lead = await this.prisma.waitlistLead.create({
        data: {
          phone: dto.phone,
          email: dto.email,
          source: dto.source || 'FEATURES_PAGE',
        },
      });

      // Hook in Mailing Service for user confirmation mail
      if (dto.email) {
        await this.emailService.send({
          tenantId: null,
          recipientType: 'LEAD',
          emailType: 'WAITLIST_CONFIRMED',
          referenceId: lead.id,
          module: 'MOBILE_SHOP',
          to: dto.email,
          subject: 'You are on the MobiBix Waitlist 🎉',
          data: {
            phone: dto.phone,
          },
        });
      }

      this.logger.log(`New waitlist lead joined: ${lead.phone}`);

      return {
        message: 'Successfully joined waitlist!',
        lead,
      };
    } catch (error) {
      this.logger.error(`Failed to join waitlist for ${dto.phone}`, error.stack);
      throw error;
    }
  }
}
