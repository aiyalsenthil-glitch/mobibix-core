# Compatibility Finder - User & Feature Documentation

## Overview
The **Compatibility Finder** is a specialized tool within the MobiBix frontend designed for repair shop technicians. It allows users to quickly identify which spare parts (tempered glass, batteries, CC boards, etc.) are compatible with a specific phone model, leveraging a global database of over **7,000 relations**.

## Access & Permissions

### Navigation
*   **Menu Path**: `Sidebar -> Tools -> Compatibility Finder`
*   **Visibility**: Only visible to tenants with the `MOBILE_SHOP` module active (Mobibix users).
*   **Exclusions**: Specifically hidden from the **Accountant** role to keep the interface focused on operational staff and technicians.

### Permissions
*   Requires the `mobile_shop.compatibility.view` permission (included in owner and staff roles by default).

## Key Features

### 1. Smart Autocomplete Search
The search bar uses a specialized backend endpoint (`/compatibility/autocomplete`) to suggest phone models as the user types.
*   **Trigger**: Starts after 2 characters.
*   **Search Scope**: Matches against both brand names and model numbers.
*   **Performance**: Results are cached and limited to top 15 matches for speed.

### 2. Categorized Results
Search results are grouped into logical spare part categories:
*   **Display / Folder**: LCD and AMOLED combos.
*   **Tempered Glass**: Screen protectors.
*   **Battery**: Internal batteries.
*   **Back Cover / Panel**: Housing and back glass.
*   **Charging Board / CC Board**: Charging ports and flex cables.
*   **Touch / OCA Glass**: Outer glass.

### 3. Cross-Model Compatibility
For every result, the tool display an "Also fits" or "Compatible with" list. This tells the technician that if they have a part for Model A, it will also work for Models B and C.
*   *Example*: Searching for "Samsung A50" will show that its tempered glass also fits "Samsung A50S, M31, M21".

### 4. Direct Inventory Integration
If the shop has items in their local inventory linked to a compatibility group, the tool will display:
*   **Current Stock Quantity**
*   **Sale Price**
*   **Local Part Name**

## User Experience States

### Loading State
A skeleton loader and "Scanning our global compatibility database..." message appear during queries to provide feedback.

### Empty State ("Not Found")
If a model has no known compatibility data, a positive, encouraging message is shown:
> *"We are updating our database continuously. Our experts are gathering data for this model as we speak! Stay tuned."*

## Technical Implementation (Frontend)
*   **Route**: `app/(app)/tools/compatibility-finder/page.tsx`
*   **Client Component**: `CompatibilityFinderClient.tsx`
*   **API Client**: `services/compatibility.api.ts`
*   **Icons**: Powered by `lucide-react`.
*   **UI Components**: Built using Tailwind CSS and Radix UI (Card, Input, Badge).
