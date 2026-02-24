import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface EmailVerificationProps {
  module: ModuleType;
  name: string;
  verificationLink: string;
}

export const EmailVerificationEmail = ({
  module,
  name,
  verificationLink,
}: EmailVerificationProps) => {
  const brandName = module === 'MOBILE_SHOP' ? 'MobiBix' : 'GymPilot';

  return (
    <EmailLayout 
      module={module} 
      preview={`Verify your email for ${brandName}`}
      showDashboardButton={false}
    >
      <EmailSection>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
          Verify your email address
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {name},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Welcome to <strong>{brandName}</strong>! Please verify your email address by clicking the button below so you can securely access your account.
        </Text>
        
        <EmailButton module={module} href={verificationLink} fullWidth>
          Verify Email
        </EmailButton>

        <Text style={{ color: '#4b5563', lineHeight: '24px', marginTop: '24px' }}>
          If you didn't create this account, you can safely ignore this email.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          — Team {brandName}
        </Text>
      </EmailSection>
    </EmailLayout>
  );
};

export default EmailVerificationEmail;
