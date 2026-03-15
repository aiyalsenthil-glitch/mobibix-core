import { Injectable } from '@nestjs/common';
import { BaseNotificationPayload, ChannelStrategy, NotificationChannel } from '../notification.types';

@Injectable()
export class InAppStrategy implements ChannelStrategy {
  getChannel(): NotificationChannel {
    return 'IN_APP';
  }

  async send(payload: BaseNotificationPayload): Promise<boolean> {
    // For In-App notifications, 'sending' simply means recording it in the database log, 
    // which the orchestrator already does before calling strategy.send().
    // So we just return true here to indicate the 'delivery' to the in-app box is complete.
    return true;
  }
}
