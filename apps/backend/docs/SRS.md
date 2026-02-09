# System Requirements Specification (SRS)

**Version:** 1.0  
**Date:** February 7, 2026

## Overview

This is the main documentation hub for the Gym SaaS Backend system. This document serves as the entry point to understand the system architecture, modules, and decisions.

## Documentation Structure

```
docs/
├── SRS.md                    ← This document (v1.0)
├── QUICK_REFERENCE.md        ← Quick reference guide
├── costing-system.md         ← Costing system documentation
├── BILLING_MIGRATION_ANALYSIS.md
├── decisions/                ← Implementation decisions, roadmaps, fixes
├── architecture/             ← System architecture, guards, patterns
└── modules/                  ← Feature-specific documentation
    ├── accounting/
    ├── billing/
    ├── crm/
    ├── inventory/
    ├── mobibix/
    └── whatsapp/
```

## System Architecture

The system is built on:

- **Framework**: NestJS 11
- **Database**: PostgreSQL with Prisma 7 ORM
- **Auth**: Firebase Admin SDK + JWT
- **Architecture**: Nx-style monorepo

For detailed architecture information, see:

- [Core Rules](architecture/CORE_RULES.md)
- [Product Architecture](architecture/PRODUCT_ARCHITECTURE_REFACTOR.md)
- [Module Subscription](architecture/MODULE_SUBSCRIPTION_IMPLEMENTATION.md)

## Module Documentation

### CRM (Customer Relationship Management)

See [modules/crm/](modules/crm/) for comprehensive CRM documentation including:

- Customer timeline
- Follow-ups system
- Dashboard implementation

### WhatsApp Integration

See [modules/whatsapp/](modules/whatsapp/) for WhatsApp automation and messaging:

- Multi-phone support
- Automated reminders
- Variable system
- Message history

### Mobibix CRM

See [modules/mobibix/](modules/mobibix/) for Mobibix-specific CRM features and integrations.

### Billing & Invoicing

See [modules/billing/](modules/billing/) for billing system documentation:

- Invoice generation
- Document numbering
- Sales API
- Repair billing

### Inventory Management

See [modules/inventory/](modules/inventory/) for inventory system:

- Stock management
- Supplier purchases
- Stock corrections

### Accounting

See [modules/accounting/](modules/accounting/) for accounting features:

- GST handling
- Tier 2 accounting
- CA analysis

## Implementation Decisions

Key implementation decisions, roadmaps, and deployment checklists are located in [decisions/](decisions/).

## Quick Start

1. **Environment Setup**: See [README.md](../README.md) for development setup
2. **Database**: Run `cd apps/backend && npx prisma migrate dev`
3. **Development**: Run `cd apps/backend && npm run start:dev`

## References

- [Quick Reference Guide](QUICK_REFERENCE.md) - Common patterns and APIs
- [Costing System](costing-system.md) - Product costing documentation
- [Billing Migration Analysis](BILLING_MIGRATION_ANALYSIS.md)

---

_For questions or updates to this documentation, please follow the guidelines in `.github/copilot-instructions.md`_
