import axios from 'axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WhatsAppSender {
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  private readonly token = process.env.WHATSAPP_ACCESS_TOKEN;
  private readonly apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';

  async sendTemplateMessage(
    phone: string,
    templateName: string,
    parameters: string[],
  ): Promise<{ success: boolean; error?: any }> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

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
            components: parameters.length
              ? [
                  {
                    type: 'body',
                    parameters: parameters.map((text) => ({
                      type: 'text',
                      text,
                    })),
                  },
                ]
              : [],
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
