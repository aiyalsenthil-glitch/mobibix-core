# 🚀 MobiBix Open Core

**The OS for Modern Shop & Fitness Management.**

MobiBix is a production-grade, open-source engine for running high-performance shop management, inventory, CRM, and fitness business operations. It is built as an **Open Core** platform, providing a robust locally-hostable engine with seamless hooks into the **MobiBix Cloud Intelligence Layer**.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Built with NestJS](https://img.shields.io/badge/Built%20with-NestJS-E0234E?logo=nestjs)](https://nestjs.com/)
[![Powered by Next.js](https://img.shields.io/badge/Powered%20by-Next.js-000000?logo=nextdotjs)](https://nextjs.org/)

---

## ✨ Features

- 📦 **Inventory Management**: Real-time stock tracking, HSN support, and supplier management.
- 💳 **Sales & Billing**: Tax-compliant invoicing, receipt generation, and ledger tracking.
- 👥 **CRM & Membership**: Advanced customer/member profiles, follow-ups, and interaction history.
- 📱 **Omnichannel**: Desktop Web, Mobile Web, and Native Android support.
- 🔌 **Intelligence Layer**: Pluggable cloud intelligence for AI diagnostics and automated marketing.

---

## ⚡ Quick Start (2-Minute Setup)

Get up and running locally with Docker:

```bash
# 1. Clone the repo
git clone https://github.com/mobibix/mobibix-core.git && cd mobibix-core

# 2. Configure environment
cp .env.example .env

# 3. Boot the engine
docker-compose up -d
```

Access the dashboard at `http://localhost_REPLACED:3000`.

---

## 🏛️ Repository Architecture: Core vs. Cloud

MobiBix follows an Open Core model to ensure the core engine remains free and self-hostable while supporting commercial-grade intelligence.

| Feature | MobiBix Core (OSS) | MobiBix Cloud (SaaS) |
| :--- | :---: | :---: |
| Self-Hosting | ✅ Yes | Managed |
| Shop Inventory | ✅ Yes | ✅ Yes |
| Local Auth | ✅ Yes | ✅ Yes (Firebase/OAuth) |
| WhatsApp Automation | 🧱 Stubbed | ✅ Yes |
| AI Shop Diagnostics | 🧱 Stubbed | ✅ Yes |
| Global Reporting | ✅ Yes | ✅ Yes |
| Automated Backups | Manual | ✅ Managed |

---

## 📖 Documentation

Detailed documentation can be found in the [`/docs`](/docs) folder:
- [Self-Hosting Guide](/docs/OPEN_CORE_GUIDE.md)
- [Architecture & Tech Stack](/docs/ARCHITECTURE.md)
- [Contributing Guidelines](/docs/CONTRIBUTING.md)

---

## 🤝 Community & Support

- **Commercial Licensing**: For white-label or custom enterprise deployments, contact [contact@mobibix.com](mailto:contact@mobibix.com).
- **Security**: Please report security vulnerabilities to [security@mobibix.com](mailto:security@mobibix.com).

---

© 2026 MobiBix Enterprise. Code licensed under **AGPL-3.0**.
