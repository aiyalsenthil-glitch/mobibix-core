import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface TrialExpiredEmailProps {
  module: ModuleType;
  name: string;
  planName: string;
  upgradeLink: string;
}

export const TrialExpiredEmail = ({
  module,
  name,
  planName,
  upgradeLink,
}: TrialExpiredEmailProps) => {
  return (
    <EmailLayout module={module}>
      <EmailSection>
        <Text
          style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}
        >
          Your Free Trial Has Expired ⏳
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>Hi {name},</Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Your trial for the <strong>{planName}</strong> plan has ended today.
          To keep accessing your data and using premium features, please upgrade
          your subscription.
        </Text>
        <EmailButton module={module} href={upgradeLink} fullWidth>
          Upgrade Now
        </EmailButton>
      </EmailSection>
    </EmailLayout>
  );
};

export default TrialExpiredEmail;
