import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { ConfigService } from '@nestjs/config';
import { ModuleType } from '@prisma/client';

@Injectable()
export class TrialOnboardingCron {
  private readonly logger = new Logger(TrialOnboardingCron.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private getBaseUrl(module: ModuleType): string {
    return module === 'MOBILE_SHOP'
      ? this.configService.get<string>('ERP_FRONTEND_URL') || 'https://shop.mobibix.com'
      : this.configService.get<string>('GYM_FRONTEND_URL') || 'https://gym.mobibix.in';
  }

  // Run at 10:00 AM every day
  @Cron('0 10 * * *')
  async sendOnboardingEmails() {
    if (this.isRunning) {
      this.logger.log('Previous TrialOnboardingCron job still running, skipping');
      return;
    }

    this.isRunning = true;
    try {
      this.logger.log('Starting TrialOnboardingCron');

      const trials = await this.prisma.tenantSubscription.findMany({
        where: {
          status: 'TRIAL',
        },
        include: {
          tenant: {
            include: {
              users: {
                where: { role: 'OWNER' },
              },
            },
          },
        },
      });

      this.logger.log(`Found ${trials.length} active trial subscriptions.`);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Throttle helper
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      for (const trial of trials) {
        const owner = trial.tenant.users[0];
        if (!owner?.email || !owner.fullName) {
          continue;
        }

        const start = new Date(trial.startDate);
        start.setHours(0, 0, 0, 0);
        
        // Calculate diff in days
        const diffTime = today.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const module = trial.tenant.tenantType === 'GYM' ? 'GYM' : 'MOBILE_SHOP';
        const baseUrl = this.getBaseUrl(module);
        const productName = module === 'GYM' ? 'GymPilot' : 'MobiBix';

        const sendNudge = async (
          day: number,
          emailType: 'TRIAL_ONBOARDING_DAY1' | 'TRIAL_ONBOARDING_DAY3' | 'TRIAL_ONBOARDING_DAY5' | 'TRIAL_ONBOARDING_DAY7' | 'TRIAL_ONBOARDING_DAY10',
          subject: string,
          data: any,
        ) => {
          if (diffDays === day) {
            await this.emailService.send({
              tenantId: trial.tenantId,
              recipientType: 'TENANT',
              emailType,
              referenceId: `TRIAL_DAY_${day}`,
              module,
              to: owner.email!,
              subject,
              data: {
                name: owner.fullName,
                productName,
                ...data,
              },
            });
            await sleep(500); // 2 req/sec limit
          }
        };

        try {
          // Day 1: Activation
          await sendNudge(
            1,
            'TRIAL_ONBOARDING_DAY1',
            `Have you added your first ${module === 'GYM' ? 'member' : 'job card'} yet?`,
            { dashboardLink: `${baseUrl}/` }
          );

          // Day 3: Case Study
          await sendNudge(
            3,
            'TRIAL_ONBOARDING_DAY3',
            `See how [Customer Name] saved 10 hours/week with ${productName}`,
            {}
          );

          // Day 5: Feature Nudge (WhatsApp)
          await sendNudge(
            5,
            'TRIAL_ONBOARDING_DAY5',
            `Your WhatsApp reminders are not set up yet 👀`,
            { dashboardLink: baseUrl }
          );

          // Day 7: Progress
          await sendNudge(
            7,
            'TRIAL_ONBOARDING_DAY7',
            `Halfway through your trial — here's what you've accomplished`,
            { statsLink: `${baseUrl}/` }
          );

          // Day 10: Urgency
          await sendNudge(
            10,
            'TRIAL_ONBOARDING_DAY10',
            `Only 4 days left — let's make sure you're getting value`,
            { upgradeLink: `${baseUrl}/settings/billing` }
          );
        } catch (err) {
          this.logger.error(`Failed to process trial nudges for tenant ${trial.tenantId}`, err);
        }
      }

      this.logger.log('Finished TrialOnboardingCron');
    } finally {
      this.isRunning = false;
    }
  }
}
