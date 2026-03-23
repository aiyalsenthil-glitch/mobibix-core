import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionTrialExpiringEvent } from '../common/email/email.events';
import { PrismaService } from '../core/prisma/prisma.service';
import { AuthService } from '../core/auth/auth.service';

async function bootstrap() {

  const app = await NestFactory.createApplicationContext(AppModule);

  const prisma = app.get(PrismaService);
  const eventEmitter = app.get(EventEmitter2);
  const authService = app.get(AuthService);

  try {
    console.log('\n--- 1. Testing Trial Expiry Warning (EmailListener) ---');
    // Find a tenant with an owner to test the webhook
    const tenant = await prisma.tenant.findFirst({
      where: { users: { some: { role: 'OWNER', email: { not: null } } } },
      include: { users: { where: { role: 'OWNER' } }, subscription: true },
    });

    if (tenant && tenant.subscription.length > 0) {
      console.log(
        `Found tenant ${tenant.name} (${tenant.id}), Owner: ${tenant.users[0].email}`,
      );
      const sub = tenant.subscription[0];

      const event = new SubscriptionTrialExpiringEvent(
        tenant.id,
        'GYM',
        new Date(),
        sub,
        3, // daysLeft
      );


      await eventEmitter.emitAsync('subscription.trial.expiring', event);
      console.log(
        '✅ Trial Expiry Warning Event processed! (Check your console/inbox)',
      );
    } else {
      console.log(
        '⚠️ Could not find a suitable tenant with an owner email and subscription. Skipping.',
      );
    }

    console.log('\n--- 2. Testing Email Verification API (AuthService) ---');
    // Find a user with an email
    const user = await prisma.user.findFirst({
      where: { email: { not: null } },
    });

    if (user) {
      console.log(
        `Found user ${user.fullName} (${user.id}), Email: ${user.email}`,
      );

      try {
        await authService.sendVerificationEmail(user.id);
        console.log(
          '✅ Email Verification sent successfully! (Check your console/inbox)',
        );
      } catch (err: any) {
        console.log(
          '⚠️ Firebase/Email error (normal if Firebase SDK credentials are not fully seeded for this user): ',
          err.message,
        );
      }
    } else {

    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Let async operations finish (Resend API calls etc)
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await app.close();
    process.exit(0);
  }
}

bootstrap();
