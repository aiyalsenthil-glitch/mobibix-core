import axios from 'axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WhatsAppSender {
  private phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  private token = process.env.WHATSAPP_ACCESS_TOKEN;

  async sendTemplateMessage(
    phone: string,
    templateName: string,
    parameters: string[],
  ) {
    const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;

    try {
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en_US' },
            components: [
              {
                type: 'body',
                parameters: parameters.map((text) => ({
                  type: 'text',
                  text,
                })),
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }
}
