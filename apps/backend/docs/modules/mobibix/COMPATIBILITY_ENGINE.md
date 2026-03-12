# Compatibility Engine - Technical Documentation

## Overview
The **Compatibility Engine** is a module within the MobiBix ERP designed to manage and query compatibility relationships between mobile phone models and spare parts (e.g., tempered glass, displays, batteries).

Instead of duplicative records where a single part is linked individually to multiple phones, this module uses a **Compatibility Group** architecture. A single group can contain multiple phone models and multiple parts; any part in the group is automatically considered compatible with any phone in that same group.

## Data Model

### Core Entities
- **Brand**: Manufacturers (Samsung, Apple, etc.).
- **PhoneModel**: Specific devices (Samsung A50, iPhone 13).
- **Part**: Master catalog of spare parts.
- **CompatibilityGroup**: The logical container for compatible entities.
- **CompatibilityGroupPhone**: Junction table linking PhoneModels to Groups.
- **PartCompatibility**: Junction table linking Parts to Groups.

### Integration
- **ShopProduct**: Individual items in a tenant's inventory can also be linked to a `CompatibilityGroup` via `compatibilityGroupId`.

## API Endpoints

### Public / Technician API
- `GET /compatibility/search?model={modelName}`
  - Returns categorized compatible parts from both the master catalog and shop inventory.
- `POST /compatibility/suggest`
  - Returns suggested compatible phone models based on manufacturers and display sizes.

### Administrative API
- `POST /compatibility/groups` - Create a new group.
- `POST /compatibility/groups/:id/add-phone` - Add a phone model to a group.
- `POST /compatibility/groups/:id/link-part` - Link a master part to a group.

## Database Schema (Prisma)

```prisma
model CompatibilityGroup {
  id           String                    @id @default(cuid())
  name         String                    @unique
  partType     PartType
  phones       CompatibilityGroupPhone[]
  parts        PartCompatibility[]
  shopProducts ShopProduct[]          @relation("ProductCompatibilityGroup")
}

model CompatibilityGroupPhone {
  id           String             @id @default(cuid())
  groupId      String
  phoneModelId String
  group        CompatibilityGroup @relation(fields: [groupId], references: [id])
  phoneModel   PhoneModel         @relation(fields: [phoneModelId], references: [id])
}
```

## Performance & Optimization
- **Indexing**: High-performance indexes are added to `PhoneModel.modelName`, `Part.partType`, and junction table foreign keys to ensure sub-100ms search responses even with large datasets.
- **Scalability**: The grouping mechanism prevents N*M record explosion in the database.

## Data Seeding
A specialized seed script is available at `src/scripts/seed-compatibility.ts` which processes CSV data in the following format:
`group_name, part_type, phone_model`

## Future AI Roadmap
- Implement fuzzy matching for phone model names using Postgres pg_trgm.
- Enhance suggestion logic with a dedicated ML model trained on historical repair data.
