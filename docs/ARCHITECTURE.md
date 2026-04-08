# Technical Architecture

## Hub-and-Spoke Intelligence Layer

MobiBix Core uses a decentralized architecture where the engine runs locally/self-hosted and connects to the MobiBix Cloud for Intelligence services (AI, Premium Analytics).

### Core Components
- **Backend**: NestJS + Prisma
- **Web**: Next.js
- **Android**: Kotlin / Compose

### Cloud Synchronizer
Telemetry is sent via BullMQ background jobs to ensure zero-latency for the end user.