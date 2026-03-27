import { Text, Hr } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface PartnerPasswordResetEmailProps {
  module: ModuleType;
  name: string;
  businessName: string;
  resetUrl: string;
  expiresIn: string;
}

export const PartnerPasswordResetEmail = ({
  module,
  name,
  businessName,
  resetUrl,
  expiresIn,
}: PartnerPasswordResetEmailProps) => {
  return (
    <EmailLayout
      module={module}
      preview="Reset your MobiBix Partner account password"
    >
      <EmailSection>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
          Password Reset Request
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {name},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          We received a request to reset the password for your <strong>{businessName}</strong> partner account.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Click the button below to set a new password. This link expires in <strong>{expiresIn}</strong>.
        </Text>

        <EmailButton module={module} href={resetUrl} fullWidth>
          Reset My Password
        </EmailButton>

        <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />

        <Text style={{ color: '#6b7280', lineHeight: '20px', fontSize: '13px' }}>
          If you didn't request a password reset, you can safely ignore this email. Your password will not change.
        </Text>
        <Text style={{ color: '#6b7280', lineHeight: '20px', fontSize: '13px' }}>
          For security, never share this link with anyone.
        </Text>
      </EmailSection>
    </EmailLayout>
  );
};

export default PartnerPasswordResetEmail;
