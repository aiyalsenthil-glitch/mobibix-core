import * as React from 'react';
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
} from '@react-email/components';
import { ModuleType } from '@prisma/client';
import { EmailTemplateProps } from '../../email-template-types';

type Props = EmailTemplateProps['TRIAL_ONBOARDING_DAY7'] & {
  module: ModuleType;
};

export const TrialOnboardingDay7Email = ({
  name,
  statsLink,
  productName,
}: Props) => {
  return (
    <Html>
      <Head />
      <Preview>Halfway through your trial — here's how you're doing</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You're officially at the halfway point! 🎯</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            You have been using {productName} for 7 days now. By now, you should be getting a good feel for how the software streamlines your daily operations.
          </Text>
          <Text style={text}>
            Take a moment to check your dashboard and review the numbers you've processed so far. Have you added all your staff members? Have you explored the reports?
          </Text>

          <Section style={buttonContainer}>
            <Link href={statsLink} style={button}>
              View Your Dashboard
            </Link>
          </Section>

          <Text style={text}>
            If you need any help or have questions about how to get the most out of {productName}, just reply to this email!
          </Text>

          <Text style={text}>
            Best,
            <br />
            The {productName} Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  maxWidth: '600px',
};

const h1 = {
  color: '#1e293b',
  fontSize: '24px',
  fontWeight: 'bold',
  marginTop: '0',
  marginBottom: '24px',
};

const text = {
  color: '#334155',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#db2777',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '12px 24px',
  display: 'inline-block',
};
