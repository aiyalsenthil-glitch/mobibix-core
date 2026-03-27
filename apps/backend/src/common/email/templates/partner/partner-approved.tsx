import { Text, Hr } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface PartnerApprovedEmailProps {
  module: ModuleType;
  name: string;
  businessName: string;
  referralCode: string;
  trialCode: string;
  bonusCode: string;
  tempPassword: string;
  loginUrl: string;
}

export const PartnerApprovedEmail = ({
  module,
  name,
  businessName,
  referralCode,
  trialCode,
  bonusCode,
  tempPassword,
  loginUrl,
}: PartnerApprovedEmailProps) => {
  return (
    <EmailLayout
      module={module}
      preview={`Welcome to MobiBix Partner Program — Your login details inside`}
    >
      <EmailSection>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
          Your Partner Account is Approved!
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {name},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Congratulations! <strong>{businessName}</strong> has been approved as an official MobiBix Partner.
          You can now log in to your partner dashboard and start earning commissions.
        </Text>

        <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />

        <Text style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
          Your Login Details
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px', marginTop: '4px' }}>
          <strong>Login URL:</strong> {loginUrl}
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px', marginTop: '4px' }}>
          <strong>Email:</strong> (the email you applied with)
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px', marginTop: '4px' }}>
          <strong>Temporary Password:</strong>{' '}
          <span
            style={{
              fontFamily: 'monospace',
              backgroundColor: '#f3f4f6',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '15px',
              letterSpacing: '1px',
            }}
          >
            {tempPassword}
          </span>
        </Text>
        <Text style={{ color: '#ef4444', lineHeight: '20px', fontSize: '13px' }}>
          Please change your password immediately after your first login.
        </Text>

        <EmailButton module={module} href={loginUrl} fullWidth>
          Login to Partner Dashboard
        </EmailButton>

        <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />

        <Text style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
          Your Promo Codes
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px', marginTop: '4px' }}>
          Share these codes with your clients to get them started on MobiBix:
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          <strong>14-Day Free Trial:</strong>{' '}
          <span style={{ fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>
            {trialCode}
          </span>
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          <strong>+3 Months Bonus:</strong>{' '}
          <span style={{ fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>
            {bonusCode}
          </span>
        </Text>

        <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />

        <Text style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
          Your Referral Code
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px', marginTop: '4px' }}>
          Use this code to track shops that sign up through you:
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          <span style={{ fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '4px 12px', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold' }}>
            {referralCode}
          </span>
        </Text>

        <Text style={{ color: '#4b5563', lineHeight: '24px', marginTop: '24px' }}>
          Welcome to the team. Let's grow together!
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px', fontWeight: 'bold' }}>
          — The MobiBix Team
        </Text>
      </EmailSection>
    </EmailLayout>
  );
};

export default PartnerApprovedEmail;
