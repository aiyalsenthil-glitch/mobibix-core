import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface StaffInvitedEmailProps {
  module: ModuleType;
  staffName: string;
  inviterName: string;
  role: string;
  inviteLink: string;
}

export const StaffInvitedEmail = ({
  module,
  staffName,
  inviterName,
  role,
  inviteLink,
}: StaffInvitedEmailProps) => {
  const brandName = module === 'MOBILE_SHOP' ? 'MobiBix' : 'GymPilot';

  return (
    <EmailLayout module={module} preview={`You’ve been invited to join ${brandName}`}>
      <EmailSection>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
          You’ve been invited to join {brandName}
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {staffName},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          <strong>{inviterName}</strong> has invited you to join {brandName} as:
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          <strong>Role:</strong> {role}
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          You’ll be able to access dashboards, manage operations, and collaborate with the team.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          To activate your account:
        </Text>
        
        <EmailButton module={module} href={inviteLink} fullWidth>
          Accept Invitation
        </EmailButton>

        <Text style={{ color: '#4b5563', lineHeight: '24px', marginTop: '24px' }}>
          For security reasons, this link expires in 24 hours.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
           If you weren’t expecting this, you can safely ignore this email.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px', fontWeight: 'bold' }}>
           Welcome aboard 🚀
        </Text>
      </EmailSection>
    </EmailLayout>
  );
};

export default StaffInvitedEmail;
