import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface JobcardCreatedEmailProps {
  module: ModuleType;
  customerName: string;
  jobcardNumber: string;
  storeName: string;
  trackingLink: string;
}

export const JobcardCreatedEmail = ({
  module,
  customerName,
  jobcardNumber,
  storeName,
  trackingLink,
}: JobcardCreatedEmailProps) => {
    // Guard: Only for MOBILE_SHOP
    if (module !== 'MOBILE_SHOP') return null;

  return (
    <EmailLayout module={module} preview={`Service request received — ${jobcardNumber}`}>
      <EmailSection>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
          Service request received — {jobcardNumber}
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {customerName},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Your service request has been successfully registered.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          <strong>Jobcard Number:</strong> {jobcardNumber}
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
           You can track the progress anytime here:
        </Text>
        
        <EmailButton module={module} href={trackingLink} fullWidth>
          Track Service Status
        </EmailButton>

        <Text style={{ color: '#4b5563', lineHeight: '24px', marginTop: '24px' }}>
          We’ll notify you as soon as it’s ready.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Thank you for trusting {storeName}.
        </Text>
      </EmailSection>
    </EmailLayout>
  );
};

export default JobcardCreatedEmail;
