import { Text, Hr } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface MetaTokenExpiryWarningEmailProps {
  module: ModuleType;
  ownerName: string;
  phoneNumber: string;
  expiryDate: string;
  daysLeft: number;
  reconnectUrl: string;
  systemUserGuideUrl: string;
}

export const MetaTokenExpiryWarningEmail = ({
  module,
  ownerName,
  phoneNumber,
  expiryDate,
  daysLeft,
  reconnectUrl,
  systemUserGuideUrl,
}: MetaTokenExpiryWarningEmailProps) => {
  const urgency = daysLeft <= 3 ? 'URGENT: ' : daysLeft <= 7 ? 'Warning: ' : '';

  return (
    <EmailLayout
      module={module}
      preview={`${urgency}Your WhatsApp connection expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
    >
      <EmailSection>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: daysLeft <= 3 ? '#dc2626' : '#d97706' }}>
          {urgency}WhatsApp Token Expiring Soon
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {ownerName},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Your WhatsApp Business connection for <strong>{phoneNumber}</strong> will expire on{' '}
          <strong>{expiryDate}</strong> — that's in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Once expired, MobiBix will no longer be able to send automated messages, job card alerts, or
          payment receipts to your customers via WhatsApp.
        </Text>

        <EmailButton module={module} href={reconnectUrl} fullWidth>
          Reconnect WhatsApp Now
        </EmailButton>

        <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />

        <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>
          How to fix this:
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '22px', fontSize: '14px' }}>
          1. Go to <strong>Settings → WhatsApp</strong> in your MobiBix dashboard.{'\n'}
          2. Click <strong>Reconnect</strong> and re-authorize your Meta Business account.{'\n'}
          3. Or generate a long-lived System User token via the Meta Business Manager.
        </Text>

        <Text style={{ color: '#6b7280', lineHeight: '20px', fontSize: '13px', marginTop: '16px' }}>
          Need help? See the{' '}
          <a href={systemUserGuideUrl} style={{ color: '#2563eb' }}>
            Meta System User Token guide
          </a>
          {' '}or contact MobiBix support.
        </Text>
      </EmailSection>
    </EmailLayout>
  );
};

export default MetaTokenExpiryWarningEmail;
