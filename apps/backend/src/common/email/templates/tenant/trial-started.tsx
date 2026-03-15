import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface TrialStartedEmailProps {
  module: ModuleType;
  name: string;
  planName: string;
  trialEndDate: string;
  dashboardLink: string;
}

export const TrialStartedEmail = ({
  module,
  name,
  planName,
  trialEndDate,
  dashboardLink,
}: TrialStartedEmailProps) => {
  return (
    <EmailLayout module={module} preview="Your premium access starts now ✨">
      <EmailSection>
        <Text
          style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}
        >
          Your premium access starts now ✨
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>Hi {name},</Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Your <strong>{planName}</strong> trial is now active.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          You now have full access to all premium tools — no restrictions.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          <strong>Trial ends on:</strong> {trialEndDate}
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Here’s what successful users usually do in the first 3 days:
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          • Add at least 5 customers / members
          <br />
          • Invite staff
          <br />
          • Explore automation features
          <br />• Check analytics dashboard
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          The more you use it, the more value you unlock.
        </Text>

        <EmailButton module={module} href={dashboardLink} fullWidth>
          Start Exploring
        </EmailButton>

        <Text
          style={{ color: '#4b5563', lineHeight: '24px', marginTop: '24px' }}
        >
          We’ll remind you before your trial ends.
        </Text>
      </EmailSection>
    </EmailLayout>
  );
};

export default TrialStartedEmail;
