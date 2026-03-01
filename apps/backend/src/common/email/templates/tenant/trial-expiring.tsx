import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface TrialExpiringEmailProps {
  module: ModuleType;
  name: string;
  planName: string; // Kept for interface consistency, though unused in copy
  trialEndDate: string; // Changed from daysLeft to date to match copy
  upgradeLink: string;
}

export const TrialExpiringEmail = ({
  module,
  name,
  trialEndDate,
  upgradeLink,
}: TrialExpiringEmailProps) => {
  const brandName = module === 'MOBILE_SHOP' ? 'MobiBix' : 'GymPilot';

  return (
    <EmailLayout module={module} preview="Don’t lose access — 3 days left">
      <EmailSection>
        <Text
          style={{ fontSize: '20px', fontWeight: 'bold', color: '#DC2626' }}
        >
          Don’t lose access — 3 days left
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>Hi {name},</Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Your free trial ends in 3 days.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          After <strong>{trialEndDate}</strong>, your access to premium features
          will be paused.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          If <strong>{brandName}</strong> has helped streamline your operations,
          now’s the time to continue without interruption.
        </Text>

        <EmailButton module={module} href={upgradeLink} fullWidth>
          Upgrade Your Plan
        </EmailButton>

        <Text
          style={{ color: '#4b5563', lineHeight: '24px', marginTop: '24px' }}
        >
          No setup again. No data loss. Everything continues seamlessly.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Let’s keep your business moving forward.
        </Text>
      </EmailSection>
    </EmailLayout>
  );
};

export default TrialExpiringEmail;
