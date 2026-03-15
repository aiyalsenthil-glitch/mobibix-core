import { Section } from '@react-email/components';
import * as React from 'react';

interface EmailSectionProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const EmailSection = ({ children, style }: EmailSectionProps) => {
  return <Section style={{ padding: '0 48px', ...style }}>{children}</Section>;
};
