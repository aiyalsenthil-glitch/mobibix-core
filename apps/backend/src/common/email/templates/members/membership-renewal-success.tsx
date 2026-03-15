import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface MembershipRenewalSuccessEmailProps {
  module: ModuleType;
  memberName: string;
  gymName: string;
  expiryDate: string;
  renewalLink: string;
}

export const MembershipRenewalSuccessEmail = ({
  module,
  memberName,
  gymName,
  expiryDate,
  renewalLink,
}: MembershipRenewalSuccessEmailProps) => {
  // Guard: Only for GYM
  if (module !== 'GYM') return null;

  return (
    <EmailLayout module={module}>
      <EmailSection>
        <Text
          style={{ fontSize: '20px', fontWeight: 'bold', color: '#16A34A' }}
        >
          Membership Renewed! 🎉
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {memberName},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Thanks for renewing your membership at <strong>{gymName}</strong>.
          Your new expiry date is <strong>{expiryDate}</strong>.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Keep crushing your goals! 💪
        </Text>
        <EmailButton
          module={module}
          href={renewalLink}
          fullWidth
          variant="secondary"
        >
          View Membership
        </EmailButton>
      </EmailSection>
    </EmailLayout>
  );
};

export default MembershipRenewalSuccessEmail;
