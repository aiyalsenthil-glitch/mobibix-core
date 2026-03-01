import { Text, Section, Link, Hr } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';

interface EmailFooterProps {
  module: ModuleType;
}

export const EmailFooter = ({ module }: EmailFooterProps) => {
  const brandName = module === 'MOBILE_SHOP' ? 'MobiBix' : 'GymPilot';
  const website =
    module === 'MOBILE_SHOP' ? 'https://mobibix.com' : 'https://mobibix.in';

  return (
    <Section style={{ marginTop: '48px' }}>
      <Hr style={{ borderColor: '#e6ebf1', margin: '20px 0' }} />
      <Text style={{ color: '#8898aa', fontSize: '12px', lineHeight: '16px' }}>
        © {new Date().getFullYear()} {brandName}. All rights reserved.
        <br />
        <Link
          href={website}
          style={{ color: '#8898aa', textDecoration: 'underline' }}
        >
          {website.replace('https://', '')}
        </Link>
      </Text>
      <Text
        style={{
          color: '#8898aa',
          fontSize: '12px',
          lineHeight: '16px',
          marginTop: '12px',
        }}
      >
        You are receiving this email because you signed up for {brandName}.
        <br />
        123 Tech Park, Innovation Street, City, Country
      </Text>
    </Section>
  );
};
