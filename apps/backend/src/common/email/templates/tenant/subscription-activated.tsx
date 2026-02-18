import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface SubscriptionActivatedEmailProps {
  module: ModuleType;
  name: string;
  planName: string;
  nextBillingDate: string;
  dashboardLink: string;
}

export const SubscriptionActivatedEmail = ({
  module,
  name,
  planName,
  nextBillingDate,
  dashboardLink,
}: SubscriptionActivatedEmailProps) => {
  const brandName = module === 'MOBILE_SHOP' ? 'MobiBix' : 'GymPilot';

  return (
    <EmailLayout module={module} preview="AutoPay is active — you’re all set ✅">
      <EmailSection>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#16A34A' }}>
          AutoPay is active — you’re all set ✅
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {name},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Your AutoPay subscription for <strong>{planName}</strong> is now successfully activated.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          <strong>Next billing date:</strong> {nextBillingDate}
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          You don’t need to worry about renewals anymore — everything is handled automatically.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
           You can manage or cancel AutoPay anytime from your settings.
        </Text>
        
        <EmailButton module={module} href={dashboardLink} fullWidth>
          Manage Subscription
        </EmailButton>

        <Text style={{ color: '#4b5563', lineHeight: '24px', marginTop: '24px' }}>
          Thanks for choosing seamless growth with {brandName}.
        </Text>
      </EmailSection>
    </EmailLayout>
  );
};

export default SubscriptionActivatedEmail;
