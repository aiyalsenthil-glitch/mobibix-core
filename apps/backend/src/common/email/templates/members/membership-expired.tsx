import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface MembershipExpiredEmailProps {
  module: ModuleType;
  memberName: string;
  gymName: string;
  renewalLink: string;
}

export const MembershipExpiredEmail = ({
  module,
  memberName,
  gymName,
  renewalLink,
}: MembershipExpiredEmailProps) => {
  // Guard: Only for GYM
  if (module !== 'GYM') return null;

  return (
    <EmailLayout module={module}>
      <EmailSection>
        <Text
          style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}
        >
          Membership Expired ⏳
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {memberName},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Your membership at <strong>{gymName}</strong> has expired. We miss you
          already! Renew now to continue your fitness journey without
          interruption.
        </Text>
        <EmailButton module={module} href={renewalLink} fullWidth>
          Renew Membership
        </EmailButton>
      </EmailSection>
    </EmailLayout>
  );
};

export default MembershipExpiredEmail;
