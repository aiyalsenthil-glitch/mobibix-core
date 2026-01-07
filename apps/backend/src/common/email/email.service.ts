import { Resend } from 'resend';

export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
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
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY missing, email skipped');
      return;
    }
    console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);

    const result = await this.resend.emails.send({
      from: 'GymPilot <no-reply@notify.mobibix.in>',
      to,
      subject,
      html,
    });

    console.log('Resend response:', result);
    return result;
  }
}
