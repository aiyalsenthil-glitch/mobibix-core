import {
  Img,
  Section,
  Row,
  Column,
  Link,
  Button,
} from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';

interface EmailHeaderProps {
  module: ModuleType;
  showDashboardButton?: boolean;
}

const BRAND = {
  GYM: {
    name: 'GymPilot',
    primaryColor: '#1D4ED8',
    logo: 'https://mobibix.in/assets/logo-email.png',
    website: 'https://dashboard.mobibix.in',
    tagline: 'Modernizing gym management',
  },
  MOBILE_SHOP: {
    name: 'MobiBix',
    primaryColor: '#059669',
    logo: 'https://app.REMOVED_DOMAIN/assets/mobibix-main-logo.png',
    website: 'https://app.REMOVED_DOMAIN',
    tagline: 'The modern OS for mobile retailers',
  },
};

export const EmailHeader = ({
  module,
  showDashboardButton,
}: EmailHeaderProps) => {
  const config = BRAND[module] || BRAND.GYM;

  return (
    <Section
      style={{
        backgroundColor: '#ffffff',
        padding: '20px 24px',
        borderBottom: `4px solid ${config.primaryColor}`,
      }}
    >
      <Row>
        <Column align="left">
          <Link href={config.website}>
            <Img
              src={config.logo}
              width="120"
              alt={config.name}
              style={{
                display: 'block',
                outline: 'none',
                border: 'none',
                textDecoration: 'none',
              }}
            />
          </Link>
          <Section style={{ marginTop: '4px' }}>
            <span
              style={{
                fontSize: '10px',
                color: '#6B7280',
                fontFamily: 'sans-serif',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {config.tagline}
            </span>
          </Section>
        </Column>

        {showDashboardButton && (
          <Column align="right">
            <Button
              href={config.website}
              style={{
                backgroundColor: config.primaryColor,
                borderRadius: '5px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold',
                textDecoration: 'none',
                textAlign: 'center' as const,
                display: 'block',
                padding: '10px 16px',
              }}
            >
              Open Dashboard
            </Button>
          </Column>
        )}
      </Row>
    </Section>
  );
};
