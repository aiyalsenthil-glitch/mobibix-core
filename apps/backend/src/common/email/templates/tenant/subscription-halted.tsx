import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface SubscriptionHaltedEmailProps {
  module: ModuleType;
  name: string;
  billingLink: string;
}

export const SubscriptionHaltedEmail = ({
  module,
  name,
  billingLink,
}: SubscriptionHaltedEmailProps) => {
  return (
    <EmailLayout module={module}>
      <EmailSection>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>
          Subscription Suspended 🛑
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {name},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          We were unable to process your latest payment after multiple attempts.
          As a result, your subscription has been temporarily suspended.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Please update your payment method to restore access to your account.
        </Text>
        <EmailButton module={module} href={billingLink} fullWidth>
          Restore Access
        </EmailButton>
      </EmailSection>
    </EmailLayout>
  );
};

export default SubscriptionHaltedEmail;
