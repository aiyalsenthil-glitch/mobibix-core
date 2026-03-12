# Compatibility Scraper Guide

## Overview
MobiBix uses automated web scraping to maintain an up-to-date database of mobile part compatibility. This document explains how the data is collected, cleaned, and integrated into the system.

## Data Sources
1.  **ComboSupport (Primary)**: `https://combosupport.in`
    *   Gathered via a deep scraper using their internal data API.
    *   Most comprehensive source for CC boards, batteries, and frame compatibility.
2.  **Mietubl**: `https://www.mietubl.com`
    *   Primary source for global tempered glass standards.
3.  **SuperX**: `https://www.superxtemperedglass.com`
    *   Updated 2025 compatibility lists for premium tempered glass.

## Scraper Tools

### 1. `scraper_combosupport_deep.py` (The "Deep" Scraper)
This is the primary tool for bulk data collection.
*   **Method**: Reverse-engineered API calls to `combosupport.in`.
*   **Normalization Logic**:
    *   Removes supplier prefixes (e.g., "Irwin", "Proglide").
    *   Removes technical noise (e.g., "5000mAh", "(Premium Quality)").
    *   Cleans brand shorthand (SAM → Samsung, MI → Xiaomi).
*   **Output**: Structured CSV and JSON files grouped by part type.

### 2. `scraper_compatibility.py`
A broader web crawler for multi-source scanning.
*   **Method**: HTML Parsing with `BeautifulSoup4`.
*   **Feature**: Detects compatibility strings in text blocks like `Samsung A50 / A50S / M31`.

## Data Normalization Rules
To ensure high quality, the following rules are applied during scraping:

| Rule | Input Example | Output Example |
| :--- | :--- | :--- |
| **Brand Mapping** | SAM A50 | Samsung A50 |
| **Technical Cleanup** | Samsung A50 (6.4 inch) | Samsung A50 |
| **Whitelabel Removal** | Proglide Samsung A50 | Samsung A50 |
| **Group Detection** | A50 / A50s / M31 | {Samsung A50, Samsung A50s, Samsung M31} |

## Integration Workflow

### 1. Run Scraper
```bash
python3 scraper_combosupport_deep.py
```
This generates `compatibility_data.csv` in the root directory.

### 2. Update Database
The backend seed script reads the CSV and populates the Prisma-managed tables.
```bash
cd apps/backend
npx ts-node src/scripts/seed-compatibility.ts
```

## Maintenance FAQ

### How do I add a new brand?
Brand mapping is handled in the `BRAND_MAP` dictionary inside `scraper_combosupport_deep.py`. Simply add the shorthand and the full name to the map and re-run.

### How do I fix a wrong compatibility record?
1.  Identify the `group_name` in the CSV.
2.  Update the record in `compatibility_data.csv`.
3.  Re-run the seed script. The script uses `upsert`, so it will update existing names.

### The autocomplete is slow/missing models?
Ensure the seed script finished successfully. You can verify model counts with:
```sql
SELECT brand.name, COUNT(*) from mb_compatibility_phone_model pm 
JOIN mb_compatibility_brand brand ON pm."brandId" = brand.id 
GROUP BY brand.name;
```
