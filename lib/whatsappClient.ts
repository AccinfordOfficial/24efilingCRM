import { ENV } from './env';

/**
 * Meta WhatsApp Business API Client Wrapper
 * Handles sending text messages, template broadcasts, and status marking.
 */
export class WhatsAppClient {
  private accessToken: string;
  private phoneNumberId: string;
  private apiVersion: string;

  constructor(
    accessToken = ENV.WHATSAPP_TOKEN || '',
    phoneNumberId = ENV.WHATSAPP_PHONE_NUMBER_ID || '',
    apiVersion = 'v18.0'
  ) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.apiVersion = apiVersion;
  }

  /**
   * Helper to make HTTP POST requests to Meta Graph API
   */
  private async request(endpoint: string, payload: any): Promise<any> {
    if (!this.accessToken || !this.phoneNumberId) {
      console.warn("WhatsApp Client: Access token or Phone Number ID not configured yet. Simulating sandbox broadcast.");
      return {
        simulated: true,
        messages: [{ id: 'wamid.' + Math.random().toString(36).substring(7) }]
      };
    }

    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Meta API returned an error.');
      }
      return data;
    } catch (err: any) {
      console.error("WhatsApp API Request error:", err);
      throw err;
    }
  }

  /**
   * Send a standard text message
   * @param to Phone number in international format (without + symbol)
   * @param body Text message body
   */
  async sendTextMessage(to: string, body: string): Promise<any> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body }
    };
    return this.request('messages', payload);
  }

  /**
   * Send a pre-approved Meta Template message
   * @param to Phone number in international format
   * @param templateName Meta approved template name
   * @param languageCode Default 'en_US'
   * @param parameters Text parameter parameters mapping to {{1}}, {{2}}
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode = 'en_US',
    parameters: string[] = []
  ): Promise<any> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: parameters.length > 0 ? [
          {
            type: 'body',
            parameters: parameters.map(p => ({
              type: 'text',
              text: p
            }))
          }
        ] : []
      }
    };
    return this.request('messages', payload);
  }

  /**
   * Mark an incoming message as read
   * @param messageId Inbound WhatsApp message id
   */
  async markMessageAsRead(messageId: string): Promise<any> {
    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId
    };
    return this.request('messages', payload);
  }
}

export const whatsappClient = new WhatsAppClient();
