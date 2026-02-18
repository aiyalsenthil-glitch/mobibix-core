import { Button } from '@react-email/components';
import * as React from 'react';
import { ModuleType } from '@prisma/client';

export const BRAND_COLORS = {
  GYM: '#16A34A',        // Green
  MOBILE_SHOP: '#2563EB' // Blue
};

interface EmailButtonProps {
  module: ModuleType;
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
}

export const EmailButton = ({ 
  module, 
  href, 
  children,
  variant = 'primary',
  fullWidth = false 
}: EmailButtonProps) => {
  const primaryColor = module === 'MOBILE_SHOP' ? BRAND_COLORS.MOBILE_SHOP : BRAND_COLORS.GYM;
  
  const style = {
    backgroundColor: variant === 'primary' ? primaryColor : '#e2e8f0',
    color: variant === 'primary' ? '#ffffff' : '#1f2937',
    padding: '12px 24px',
    borderRadius: '6px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: fullWidth ? 'block' : 'inline-block',
    width: fullWidth ? '100%' : 'auto',
    boxSizing: 'border-box' as const,
  };

  return (
    <Button href={href} style={style}>
      {children}
    </Button>
  );
};
