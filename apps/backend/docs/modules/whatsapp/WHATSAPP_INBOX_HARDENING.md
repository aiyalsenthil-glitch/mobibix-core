# WhatsApp Inbox Hardening & Real-time Integration

## Overview
This document outlines the changes made to stabilize the WhatsApp Inbox functionality, ensuring reliable real-time message delivery and stable WebSocket connectivity.

## Key Improvements

### 1. WebSocket Connectivity
- **Public Access**: The `WhatsAppInboxGateway` has been decorated with `@Public()` to bypass global authentication guards. This prevents WebSocket handshake failures during initial connection.
- **CORS Hardening**: Updated CORS settings to use `origin: true` and `credentials: true`. This echoes the request origin, allowing cross-origin connections from frontend dev servers (e.g., ports 3005, 3006).
- **Transport explicitly enabled**: Both `websocket` and `polling` transports are enabled to allow fallback for clients with network restrictions (e.g., VPNs).

### 2. Message Persistence & Sync
- **Incoming Persistence**: The `WhatsAppInboxService` now automatically saves every incoming message from Redis into the `WhatsAppMessageLog` table before broadcasting via WebSocket. 
- **DB Provider Mapping**: Uses `WhatsAppProviderType.WEB_SOCKET` to distinguish web-service messages from Meta Cloud messages.
- **Message History**: Added `GET /whatsapp/messages/:tenantId/:phoneNumber` to fetch past conversations, ensuring the UI is populated even on refresh.
- **Conversation List**: Added `GET /whatsapp/conversations/:tenantId` to list unique contacts with the latest message snippet.

### 3. Frontend Integration
- **Auto-Sync**: The `WhatsAppInbox.tsx` component now fetches conversation lists on mount and message history on contact selection.
- **Real-time Updates**: Properly listens for `inbox:new-message` and updates the active chat or conversation list snippet in real-time.
- **Payload Correction**: Fixed message sending payload to match backend requirements (`phone` instead of `phoneNumber`, `text` instead of `body`).

## Developer Tips & Maintenance

### Debugging Connectivity
- Use `curl "http://localhost_REPLACED:3000/socket.io/?EIO=4&transport=polling"` to verify if the Socket.IO server is responding and allowing the origin.
- Check backend logs for `Client [ID] joined inbox room for tenant: [ID]`.

### Database Cleanup
- If QR codes stop generating, clear the `leveldb` storage in the `whatsapp-web-service` container or verify that the `WhatsAppNumber` setup status is being reset correctly.

### Security Note
- While the `/inbox` namespace is `@Public()`, message actions (sending, deleting, etc.) still require full JWT authentication and tenant-level access validation through the `WhatsAppController`.
