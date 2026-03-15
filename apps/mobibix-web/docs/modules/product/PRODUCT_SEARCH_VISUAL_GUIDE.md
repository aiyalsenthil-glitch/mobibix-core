# Product Search UI - Visual Guide

## Invoice Form - Product Selection Section

### Search Active (User typing "iPhone")

```
╔═══════════════════════════════════════════════════════════════╗
│ Product Items                  [✓] Prices are Tax Inclusive   │
╠═══════════════════════════════════════════════════════════════╣
│ # │ Product/Description      │ HSN/SAC │ Qty. │ Price │ GST%│
├───┼──────────────────────────┼─────────┼──────┼───────┼─────┤
│ 1 │ [iPhone search... 🌐]    │         │      │       │     │
│   │ ┌────────────────────────────────────────────────────────┐
│   │ │ iPhone 15 Pro                                          │
│   │ │ SKU: IP15PRO | Stock: 5                               │
│   │ ├────────────────────────────────────────────────────────┤
│   │ │ iPhone 15 Plus                                         │
│   │ │ SKU: IP15PL | Stock: 3                                │
│   │ ├────────────────────────────────────────────────────────┤
│   │ │ iPhone SE                                              │
│   │ │ SKU: IPSE | Stock: 8                                  │
│   │ └────────────────────────────────────────────────────────┘
└───┴──────────────────────────┴─────────┴──────┴───────┴─────┘
```

### No Products Found - Create Option

```
│ 1 │ [Samsung search... 🌐]   │         │      │       │     │
│   │ ┌────────────────────────────────────────────────────────┐
│   │ │ No products found                                      │
│   │ │ + Create New Product                                   │
│   │ └────────────────────────────────────────────────────────┘
```

### Product Selected - Full Row

```
│ 1 │ iPhone 15 Pro            │ 8517    │ 1    │ ₹79999│  18  │
```

## Features Breakdown

### 1. Search Input

- Placeholder: "Search by name..."
- Real-time filtering as user types
- Focus ring in blue (focus:ring-blue-500)
- Icon/Button area on the right

### 2. Globe Icon (🌐)

- Always visible next to search field
- Click to create new product
- Opens ProductModal
- Available even when dropdown is closed

### 3. Dropdown (when searching)

- Appears below search input
- Max height with scrollable overflow
- Shows up to all matching products
- Each item shows:
  - Product name (large text)
  - SKU and Stock info (small gray text)
  - Hover effect (blue highlight)
  - Selected item has blue background

### 4. Product Details

Once selected, auto-fills:

- Product name (from dropdown)
- HSN/SAC code (from inventory)
- Rate/Price (from inventory)
- GST% (from inventory)
- Quantity (defaults to 1)

## Color Scheme

### Light Mode

- Search input: White background, gray border
- Focus ring: Blue (ring-blue-500)
- Dropdown: White background, gray border
- Hover: Light blue (bg-blue-50)
- Selected: Blue background (bg-blue-100)
- Text: Black for main, gray for details

### Dark Mode

- Search input: Gray-900 bg, white/20 border
- Focus ring: Blue (ring-blue-500)
- Dropdown: Gray-800 background, white/20 border
- Hover: Blue with opacity (bg-blue-500/20)
- Selected: Dark blue (bg-blue-500/30)
- Text: White for main, gray-400 for details
- Globe icon: Blue-400

## Interaction Flow

```
User Action              →  System Response
────────────────────────────────────────────────
Click search field        →  Input gets focus
Type product name         →  Dropdown shows matching products
Product appears           →  User can see SKU and stock
Click product             →  Item row populates with details
                             Dropdown closes
                             Search field shows product name

Product not found         →  Shows "No products found"
Click "+ Create New"      →  ProductModal opens
OR Click 🌐 icon         →  ProductModal opens

ProductModal:
Enter details             →  Validate form
Click "Create Product"    →  API call to create product
                             Product added to list
                             Modal closes
                             New product appears in search results
                             User can select it
```

## Comparison with Customer Search

| Feature            | Customer Search         | Product Search                   |
| ------------------ | ----------------------- | -------------------------------- |
| **Input Field**    | Phone/Name search       | Product name search              |
| **Dropdown**       | Customer details        | Product details                  |
| **Info Shown**     | Name, Phone, Address    | Name, SKU, Stock                 |
| **Create New**     | "+ Create New Customer" | "+ Create New Product" / 🌐 icon |
| **Modal Opens**    | CustomerModal           | ProductModal                     |
| **Auto-fill**      | Phone, Name             | Product name, Price, HSN, GST%   |
| **Search Trigger** | min 3 characters        | any match found                  |
| **Behavior**       | Identical pattern       | Identical pattern                |

## Responsive Design

### Desktop (Full width)

```
Search input takes ~80% of column, 🌐 icon takes ~20%
Dropdown spans full width below
```

### Tablet

```
Same layout, slightly narrower
Dropdown still fully visible
Touch targets properly sized (44px minimum)
```

### Mobile

```
Same layout
Dropdown scrolls within viewport
Touch-friendly interaction areas
Full keyboard support for text input
```

## Accessibility Features

- Proper focus management (visible blue ring)
- Keyboard navigation in dropdown (future enhancement)
- Theme-aware colors for visibility
- Semantic HTML with proper input elements
- Screen reader friendly (text labels, ARIA attributes can be added)

## Browser DevTools - Code Structure

```typescript
// Per-item states
productSearches[itemId] = "iPhone"; // Current search term
productDropdowns[itemId] = true; // Is dropdown visible?

// Handlers
handleProductSearch(itemId, searchTerm); // Update search
selectProduct(itemId, product); // Select & close
getFilteredProducts(itemId); // Get matches
```

## Performance Notes

- Filter runs on every keystroke (client-side, instant)
- No debouncing needed (simple string.includes() match)
- Dropdown renders only when visible
- Large product lists handled efficiently
