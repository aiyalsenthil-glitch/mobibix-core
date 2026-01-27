import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable() // 🔥 REQUIRED
export class EmailService {
  private resend: Resend | null = null;
  private logger = new Logger(EmailService.name);

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      try {
        this.resend = new Resend(apiKey);
        this.logger.log('Resend email service initialized');
      } catch (error) {
        this.logger.warn('Failed to initialize Resend', error);
      }
    } else {
      this.logger.warn(
        'Resend API key not provided. Email functionality will be disabled.',
      );
    }
  }

  async sendEmail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }) {
    if (!this.resend) {
      this.logger.warn('Resend not configured. Email skipped.');
      return null;
    }

    return this.resend.emails.send({
      from: 'GymPilot <no-reply@notify.mobibix.in>',
      to,
      subject,
      html,
    });
  }
}
