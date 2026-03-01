import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface PlanDowngradedEmailProps {
  module: ModuleType;
  name: string;
  newPlanName: string;
  effectiveDate: string;
  dashboardLink: string;
}

export const PlanDowngradedEmail = ({
  module,
  name,
  newPlanName,
  effectiveDate,
  dashboardLink,
}: PlanDowngradedEmailProps) => {
  return (
    <EmailLayout module={module}>
      <EmailSection>
        <Text
          style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}
        >
          Subscription Update
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>Hi {name},</Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          This email confirms that your subscription has been changed to the{' '}
          <strong>{newPlanName}</strong> plan. This change is effective from{' '}
          {effectiveDate}.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          If you did not request this change, please contact support
          immediately.
        </Text>
        <EmailButton module={module} href={dashboardLink} fullWidth>
          View Subscription
        </EmailButton>
      </EmailSection>
    </EmailLayout>
  );
};

export default PlanDowngradedEmail;
