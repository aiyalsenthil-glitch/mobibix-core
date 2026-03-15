import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface JobcardCompletedEmailProps {
  module: ModuleType;
  customerName: string;
  jobcardNumber: string;
  deviceName: string;
  cost: string;
  storeName: string;
  trackingLink: string;
}

export const JobcardCompletedEmail = ({
  module,
  customerName,
  jobcardNumber,
  deviceName,
  cost,
  storeName,
  trackingLink,
}: JobcardCompletedEmailProps) => {
  // Guard: Only for MOBILE_SHOP
  if (module !== 'MOBILE_SHOP') return null;

  return (
    <EmailLayout module={module} preview={`Job ${jobcardNumber} Completed! ✅`}>
      <EmailSection>
        <Text
          style={{ fontSize: '20px', fontWeight: 'bold', color: '#16A34A' }}
        >
          Repair Completed! 🎉
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {customerName},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Good news! Your device <strong>{deviceName}</strong> is ready for
          pickup at <strong>{storeName}</strong>.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          <strong>Total Cost:</strong> {cost}
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Please visit the store to collect your device.
        </Text>

        <EmailButton module={module} href={trackingLink} fullWidth>
          View Job Details
        </EmailButton>
      </EmailSection>
    </EmailLayout>
  );
};

export default JobcardCompletedEmail;
