import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface MemberExpiringEmailProps {
  module: ModuleType;
  memberName: string;
  gymName: string;
  expiryDate: string;
  renewLink: string;
}

export const MemberExpiringEmail = ({
  module,
  memberName,
  gymName,
  expiryDate,
  renewLink,
}: MemberExpiringEmailProps) => {
    // Guard: Only for GYM
    if (module !== 'GYM') return null;

  return (
    <EmailLayout module={module} preview="Your membership ends soon">
      <EmailSection>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
          Your membership ends soon
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {memberName},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Just a reminder — your membership at <strong>{gymName}</strong> expires on <strong>{expiryDate}</strong>.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px', fontWeight: 'bold' }}>
          Don’t break your momentum 💪
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Renew today to continue enjoying:
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          • Full access to facilities<br />
          • Ongoing progress tracking<br />
          • Member benefits
        </Text>
        
        <EmailButton module={module} href={renewLink} fullWidth>
          Renew Now
        </EmailButton>

        <Text style={{ color: '#4b5563', lineHeight: '24px', marginTop: '24px' }}>
          We look forward to seeing you at the gym!
        </Text>
      </EmailSection>
    </EmailLayout>
  );
};

export default MemberExpiringEmail;
