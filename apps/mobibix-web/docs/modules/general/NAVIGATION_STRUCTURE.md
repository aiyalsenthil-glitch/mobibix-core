# Navigation Structure - Stock Management Features

## Owner Dashboard Routes

The negative stock and stock correction features are integrated into the main owner dashboard sidebar navigation.

---

## Navigation Hierarchy

### Main Navigation → Inventory Submenu

```
📊 Dashboard          → /dashboard
💰 Sales              → /sales
🔧 Job Cards          → /jobcards
🏷️ Products           → /products
📦 Inventory          → /inventory (main page)
   └─ Stock Management    → /inventory
   └─ Negative Stock Report → /inventory/negative-stock
   └─ Stock Correction    → /inventory/stock-correction
👥 Customers          → /customers
🚚 Suppliers          → /suppliers
📥 Purchases          → /purchases
📈 Reports            → /reports
🏪 Shops              → /shops
⚙️ Settings           → /settings
```

---

## Access Points

### 1. Direct Navigation (from Sidebar)

**Route**: `/inventory/negative-stock`

Click on Inventory → Negative Stock Report in the sidebar

**Features**:

- View all products with negative stock
- Filter by shop
- Filter by severity (Moderate/Severe)
- One-click correction buttons

---

### 2. Direct Navigation (from Sidebar)

**Route**: `/inventory/stock-correction`

Click on Inventory → Stock Correction in the sidebar

**Features**:

- Manual stock adjustment form
- Product selector
- Quantity input (±)
- Reason dropdown
- Optional note
- Confirmation modal

---

### 3. Deep Link from Negative Stock Report

**Route**: `/inventory/stock-correction?shopId=XXX&productId=YYY`

Click "Correct Stock" button on any row in the negative stock report table

**Behavior**:

- Form pre-fills with selected product
- Shop ID passed in URL
- After successful correction → redirects back to negative stock report

---

## Sidebar Structure

The sidebar now includes expandable submenu items:

### Desktop View (Expanded)

```
┌─────────────────────────────┐
│     📦 Inventory      ▼     │
│       Stock Management      │
│       Negative Stock Report │
│       Stock Correction      │
└─────────────────────────────┘
```

- Click on "Inventory" header to expand/collapse submenu
- Submenu items show as indented, smaller text
- Vertical line separator on left
- Active submenu item highlighted in teal

### Collapsed Sidebar

```
┌───┐
│📦 │  (Inventory menu collapses)
│   │  (Submenu not visible)
└───┘
```

- Shows only icon
- Tooltip on hover shows full text
- Submenu hidden when collapsed

---

## Component Architecture

**Sidebar Component**: `src/components/layout/sidebar.tsx`

```typescript
interface NavItem {
  label: string;
  href?: string;
  icon: string;
  submenu?: Array<{ label: string; href: string }>;
}

const navItems: NavItem[] = [
  // ... other items
  {
    label: "Inventory",
    href: "/inventory",
    icon: "📦",
    submenu: [
      { label: "Stock Management", href: "/inventory" },
      { label: "Negative Stock Report", href: "/inventory/negative-stock" },
      { label: "Stock Correction", href: "/inventory/stock-correction" },
    ],
  },
  // ... other items
];
```

**Features**:

- Expandable submenu with toggle state
- Smooth animations (▼ / ▶ indicators)
- Active route highlighting
- Dark mode support
- Collapse/expand sidebar
- Tooltip on hover (collapsed state)

---

## User Workflows

### Workflow 1: Check Negative Stock

```
1. Click "📦 Inventory" in sidebar
2. Click "Negative Stock Report" in submenu
3. → Navigates to /inventory/negative-stock
4. Apply filters (shop, severity)
5. View table of negative stock products
```

### Workflow 2: Manual Correction

```
1. Click "📦 Inventory" in sidebar
2. Click "Stock Correction" in submenu
3. → Navigates to /inventory/stock-correction
4. Select product
5. Enter adjustment details
6. Submit correction
```

### Workflow 3: Fix Specific Negative Stock

```
1. Click "📦 Inventory" in sidebar
2. Click "Negative Stock Report" in submenu
3. → Opens /inventory/negative-stock
4. Find product in table
5. Click "Correct Stock" button
6. → Pre-fills form, navigates to /inventory/stock-correction?shopId=X&productId=Y
7. Submit correction
8. → Redirects back to negative stock report
```

---

## URL Reference

| Feature                       | Route                         | Parameters                       |
| ----------------------------- | ----------------------------- | -------------------------------- |
| Stock Management (List/Input) | `/inventory`                  | None                             |
| Negative Stock Report         | `/inventory/negative-stock`   | `shopId` (optional)              |
| Stock Correction              | `/inventory/stock-correction` | `shopId`, `productId` (optional) |

---

## Navigation Highlights

✨ **Features**:

- Expandable submenu (stores in component state)
- Active route highlighting
- Smooth transitions and animations
- Dark mode compatible
- Fully responsive
- Keyboard navigable

🎨 **Visual Design**:

- Teal accent color (matches brand)
- Gradient backgrounds for active items
- Border separators for submenu
- Icon + text navigation
- Left-aligned layout

⚡ **Performance**:

- Minimal re-renders
- CSS-based animations (no JavaScript transitions)
- Uses URL pathname for active detection
- No additional API calls from sidebar

---

## Future Enhancements

1. **Keyboard Navigation**
   - Arrow keys to expand/collapse
   - Enter to navigate
   - Tab to cycle through items

2. **Search within Sidebar**
   - Quick search for menu items
   - Shortcut key (e.g., Cmd+K)

3. **Favorites/Shortcuts**
   - Pin frequently used items
   - Custom menu order

4. **Mobile Menu**
   - Drawer/hamburger menu
   - Touch-optimized

5. **Role-Based Visibility**
   - Hide items based on user permissions
   - Owner vs Staff menu differences

---

## Integration Notes

- Sidebar is rendered in `app/(app)/layout.tsx`
- All sub-pages inherit the sidebar layout
- Uses Next.js `usePathname()` for active detection
- Uses `localStorage` for sidebar collapse state
- Theme context for dark mode support

---

## Testing Checklist

- [ ] Sidebar displays all navigation items
- [ ] Inventory submenu expands/collapses on click
- [ ] Active routes highlight correctly
- [ ] Navigation links work (no 404s)
- [ ] Dark mode styling correct
- [ ] Collapse/expand sidebar works
- [ ] Submenu hidden when sidebar collapsed
- [ ] Deep links work (navigate with URL parameters)
- [ ] Back navigation works after submission
- [ ] Page scrolls to top on navigation
