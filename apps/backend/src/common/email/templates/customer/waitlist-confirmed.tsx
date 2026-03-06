import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Img,
} from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';

export interface WaitlistConfirmedEmailProps {
  module: ModuleType;
  phone: string;
}

export const WaitlistConfirmedEmail = ({
  module = 'MOBILE_SHOP',
  phone = '',
}: WaitlistConfirmedEmailProps) => {
  const isMobibix = module === 'MOBILE_SHOP';
  const appName = isMobibix ? 'MobiBix' : 'GymPilot';
  const logoUrl = isMobibix
    ? 'https://mobibix.com/logo.png' // Replace with actual logo URL
    : 'https://mobibix.in/logo.png'; // Replace with actual logo URL
  const primaryColor = isMobibix ? '#2563eb' : '#dc2626';

  return (
    <Html>
      <Head />
      <Preview>You are officially on the {appName} Waitlist! 🎉</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img src={logoUrl} height="40" alt={appName} />
          </Section>

          <Heading style={h1}>You're on the list! 🎉</Heading>

          <Text style={text}>
            Hello there,
          </Text>
          <Text style={text}>
            Thank you for registering your interest in the new {appName} WhatsApp CRM feature!
          </Text>
          <Text style={text}>
            We have successfully recorded your details for the WhatsApp number: <strong>{phone}</strong>.
          </Text>
          
          <Section style={highlightSection}>
            <Text style={text}>
              <strong>What happens next?</strong><br/>
              Our engineering team is currently finalizing the official Meta Cloud API integrations.
              Once we roll out the beta, you will be among the very first shops to get access to 
              digital receipts, repair alerts, and shared team inboxes.
            </Text>
          </Section>

          <Text style={text}>
            We will notify you directly via WhatsApp as soon as your account is ready to be upgraded.
          </Text>

          <Text style={text}>
            If you have any immediate questions, simply grab a coffee and hang tight, or check out our <Link href={`https://${appName.toLowerCase()}.com`} style={{ color: primaryColor }}>website</Link> for more updates.
          </Text>

          <Text style={footer}>
            Best regards,<br />
            The {appName} Engineering Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WaitlistConfirmedEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  marginBottom: '64px',
  borderRadius: '8px',
  border: '1px solid #e1e4e8',
};

const header = {
  marginBottom: '24px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.25',
  marginBottom: '24px',
};

const text = {
  color: '#555',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
};

const highlightSection = {
  backgroundColor: '#f8fafc',
  padding: '16px',
  borderRadius: '8px',
  marginBottom: '24px',
  borderLeft: '4px solid #2563eb',
};

const footer = {
  color: '#888',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '32px',
};
