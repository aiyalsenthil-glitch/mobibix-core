import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface PlanUpgradedEmailProps {
  module: ModuleType;
  name: string;
  newPlanName: string;
  effectiveDate: string;
  dashboardLink: string;
}

export const PlanUpgradedEmail = ({
  module,
  name,
  newPlanName,
  effectiveDate,
  dashboardLink,
}: PlanUpgradedEmailProps) => {
  return (
    <EmailLayout module={module}>
      <EmailSection>
        <Text
          style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}
        >
          Subscription Upgraded! 🎉
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>Hi {name},</Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Great news! Your workspace has been successfully upgraded to the{' '}
          <strong>{newPlanName}</strong> plan, effective from {effectiveDate}.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          You now have access to all the new features included in your plan.
        </Text>
        <EmailButton module={module} href={dashboardLink} fullWidth>
          View Dashboard
        </EmailButton>
      </EmailSection>
    </EmailLayout>
  );
};

export default PlanUpgradedEmail;
