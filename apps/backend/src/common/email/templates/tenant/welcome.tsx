import { Text } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';
import { EmailLayout } from '../components/layout';
import { EmailButton } from '../components/button';
import { EmailSection } from '../components/section';

interface WelcomeEmailProps {
  module: ModuleType;
  tenantName: string;
  link: string;
  promoCode?: string;
  promoDescription?: string;
}

export const WelcomeEmail = ({
  module,
  tenantName,
  link,
  promoCode,
  promoDescription,
}: WelcomeEmailProps) => {
  const brandName = module === 'MOBILE_SHOP' ? 'MobiBix' : 'GymPilot';

  return (
    <EmailLayout
      module={module}
      preview={`Welcome to ${brandName} — Let’s grow 🚀`}
      showDashboardButton={true}
    >
      <EmailSection>
        <Text
          style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}
        >
          Welcome to {brandName} — Let’s grow 🚀
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Hi {tenantName},
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          You’re officially live on <strong>{brandName}</strong> 🎉
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          From today, you have everything you need to manage operations, track
          performance, and scale with confidence — all in one place.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          Here’s how to get value fast:
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          ✅ Add your team
          <br />
          ✅ Set up your business profile
          <br />
          ✅ Start managing customers / members
          <br />✅ Explore real-time reports
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          The sooner you set things up, the faster you’ll see results.
        </Text>

        {promoCode && (
          <div style={{ 
            backgroundColor: '#f0fdf4', 
            border: '1px solid #bbf7d0', 
            borderRadius: '8px', 
            padding: '16px', 
            marginTop: '20px', 
            marginBottom: '20px' 
          }}>
            <Text style={{ margin: 0, color: '#166534', fontWeight: 'bold', fontSize: '14px' }}>
              🎁 PROMO ACTIVATED: {promoCode}
            </Text>
            <Text style={{ margin: '4px 0 0 0', color: '#15803d', fontSize: '14px' }}>
              {promoDescription || 'Your special launch offer has been applied to your account!'}
            </Text>
          </div>
        )}

        <EmailButton module={module} href={link} fullWidth>
          Go to Dashboard
        </EmailButton>

        <Text
          style={{ color: '#4b5563', lineHeight: '24px', marginTop: '24px' }}
        >
          We’re excited to be part of your growth journey.
        </Text>
        <Text style={{ color: '#4b5563', lineHeight: '24px' }}>
          — Team {brandName}
        </Text>
      </EmailSection>
    </EmailLayout>
  );
};

export default WelcomeEmail;
