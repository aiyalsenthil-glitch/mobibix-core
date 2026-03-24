import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailSection } from '../components/section';

interface CustomEmailProps {
  module: ModuleType;
  subject: string;
  body: string;
  preview?: string;
}

export const CustomEmail = ({
  module,
  subject,
  body,
  preview,
}: CustomEmailProps) => {
  const brandName = module === 'MOBILE_SHOP' || module === 'MOBILE_REPAIR' ? 'MobiBix' : 'GymPilot';

  return (
    <EmailLayout
      module={module}
      preview={preview || subject}
      showDashboardButton={false}
    >
      <EmailSection>
        <Text
          style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}
        >
          {subject}
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px', whiteSpace: 'pre-wrap' }}>
          {body}
        </Text>
        
        <Text
          style={{ color: '#4b5563', lineHeight: '24px', marginTop: '24px' }}
        >
          Regards,
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          — Team {brandName}
        </Text>
      </EmailSection>
    </EmailLayout>
  );
};

export default CustomEmail;
