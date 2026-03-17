import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { Public } from '../../../core/auth/decorators/public.decorator';

@Public()
@WebSocketGateway({
  cors: { 
    origin: true,
    credentials: true,
    methods: ['GET', 'POST']
  },
  namespace: 'inbox',
  transports: ['websocket', 'polling']
})
export class WhatsAppInboxGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WhatsAppInboxGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const tenantId = client.handshake.query.tenantId as string;
    if (tenantId) {
      client.join(`tenant:${tenantId}`);
      this.logger.log(`Client ${client.id} joined inbox room for tenant: ${tenantId}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected from inbox`);
  }

  /**
   * Broadcast a new message to all connected clients for a tenant
   */
  broadcastNewMessage(tenantId: string, payload: any) {
    this.server.to(`tenant:${tenantId}`).emit('inbox:new-message', payload);
  }
}
