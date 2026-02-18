import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface JobcardStatusUpdatedEmailProps {
  module: ModuleType;
  customerName: string;
  jobcardNumber: string;
  newStatus: string;
  storeName: string;
  trackingLink: string;
}

export const JobcardStatusUpdatedEmail = ({
  module,
  customerName,
  jobcardNumber,
  newStatus,
  storeName,
  trackingLink,
}: JobcardStatusUpdatedEmailProps) => {
    // Guard: Only for MOBILE_SHOP
    if (module !== 'MOBILE_SHOP') return null;

  return (
    <EmailLayout module={module} preview={`Job ${jobcardNumber} Update: ${newStatus}`}>
      <EmailSection>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
          Repair Status Update 🔄
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {customerName},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          The status of your repair job <strong>{jobcardNumber}</strong> at <strong>{storeName}</strong> has been updated to:
        </Text>
        <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#2563EB', textAlign: 'center', margin: '24px 0' }}>
            {newStatus}
        </Text>
        
        <EmailButton module={module} href={trackingLink} fullWidth>
          View Details
        </EmailButton>
      </EmailSection>
    </EmailLayout>
  );
};

export default JobcardStatusUpdatedEmail;
