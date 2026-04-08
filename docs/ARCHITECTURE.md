# 🧠 Technical Architecture: Hub-and-Spoke Intelligence

The MobiBix architecture is designed to balance **Local Sovereignty** with **Cloud Intelligence**.

---

## 🔗 The Core vs. Cloud Model

MobiBix operates on a Hub-and-Spoke model:

1.  **The Hub (MobiBix Core)**: The locally-controlled engine that handles your database, inventory, billing, and user management. It is 100% functional without an internet connection.
2.  **The Spoke (MobiBix Cloud)**: A proprietary intelligence layer that provides high-value services like AI shop diagnostics, automated WhatsApp marketing, and global fleet analytics.

### Install ID Correlation
When a Core instance starts, it generates a unique `InstallId`. If Cloud Integration is enabled, this ID is sent along with anonymized telemetry to provide system health insights and enable commercial features.

---

## 🔐 Security & Privacy

Privacy is the foundation of MobiBix Core.

- **Tenant Isolation**: Each shop's data is logically isolated via the `tenantId` schema.
- **Anonymized Telemetry**: We only track system counts (e.g., total invoices created, total active tenants) to understand usage scale. **No Personally Identifiable Information (PII)** like customer names, phone numbers, or email addresses is ever sent to the Cloud layer from the Core.
- **Local Sovereignty**: You own your database. MobiBix Cloud cannot access your raw database; it only responds to specific API requests triggered by your instance (e.g., "Analyze this anonymized ledger entry").

---

## 🧱 Module Overview

- **`apps/backend`**: NestJS engine providing the REST API.
- **`apps/mobibix-web`**: React dashboard for shop administrators.
- **`apps/mobibix-android`**: Native Android app for shop floor operations.
- **`packages/`**: Shared types, DTOs, and utility logic.

---

© 2026 MobiBix Enterprise.