# Inventory Management – Quick Visual Guide

## Screen Layouts

### Default State – Form Collapsed

```
Inventory Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ Add Stock [Expand]

Product Name        Current Stock   Sale Price   Cost Price       Status    Action
────────────────────────────────────────────────────────────────────────────────────
Tempered Glass      4               ₹100.00      ₹50.00 ✓ Set     🟢 Ready  Edit Cost
UV Tempered         6               ₹150.00      Not Set ⚠ Miss   🟡 Incom  Edit Cost
Screen Protector    12              ₹25.00       ₹10.00 ✓ Set     🟢 Ready  Edit Cost
```

### Form Expanded – Add Stock

```
Inventory Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▼ Add Stock [Collapse]
──────────────────────────────────────────

Product *
[Search product...]
Tempered Glass
─────────────────────────────────────────
✓ Selected: Tempered Glass

Quantity *
[1                  ]

Cost Price per Unit (₹) *
[50.00              ]
💡 Cost must be greater than 0...

✓ Add Stock

────────────────────────────────────────────────────────

Product Name        Current Stock   Sale Price   Cost Price       Status    Action
────────────────────────────────────────────────────────────────────────────────────
Tempered Glass      4               ₹100.00      ₹50.00 ✓ Set     🟢 Ready  Edit Cost
UV Tempered         6               ₹150.00      Not Set ⚠ Miss   🟡 Incom  Edit Cost
Screen Protector    12              ₹25.00       ₹10.00 ✓ Set     🟢 Ready  Edit Cost
```

### Cost Editing – Inline

```
Product Name        Current Stock   Sale Price   Cost Price       Status    Action
────────────────────────────────────────────────────────────────────────────────────
UV Tempered         6               ₹150.00      [60.00] ✓ ✕      🟡 Incom  (hidden)
Screen Protector    12              ₹25.00       ₹10.00 ✓ Set     🟢 Ready  Edit Cost
```

### After Cost Update

```
Product Name        Current Stock   Sale Price   Cost Price       Status    Action
────────────────────────────────────────────────────────────────────────────────────
UV Tempered         6               ₹150.00      ₹60.00 ✓ Set     🟢 Ready  Edit Cost
Screen Protector    12              ₹25.00       ₹10.00 ✓ Set     🟢 Ready  Edit Cost
```

---

## Key Features at a Glance

### ✅ What Users Can Do

| Action        | Location       | Steps                                                                           |
| ------------- | -------------- | ------------------------------------------------------------------------------- |
| Add Stock     | Collapsed Form | 1. Click "Add Stock" 2. Select product 3. Enter qty & cost 4. Click "Add Stock" |
| Edit Cost     | Table Row      | 1. Click "Edit Cost" 2. Enter new cost 3. Click ✓                               |
| View Costs    | Table Column   | All products show cost status in "Cost Price" column                            |
| See Status    | Table Column   | Automatically shows 🟢 Ready or 🟡 Incomplete                                   |
| Find Products | Form Search    | Type in search → shows stock, price, cost in results                            |

---

## Column Explanation

### Product Name

Shows the product name as string

### Current Stock

Shows quantity in inventory. Red text if negative with "Negative" badge.

### Sale Price

Shows retail/selling price in rupees (₹)

### Cost Price ⭐ NEW

Shows cost per unit:

- **Set**: ₹50.00 ✓ Set (green badge)
- **Missing**: Not Set ⚠ Missing (red badge)
- **Editable**: Click "Edit Cost" to modify

### Status ⭐ NEW

Auto-calculated from cost:

- **🟢 Ready**: cost > 0 (can be sold)
- **🟡 Incomplete**: cost missing (cannot sell)

### Action ⭐ NEW

Shows "Edit Cost" button to modify cost inline

---

## Form States & Colors

### Success Alert

```
✅ Cost updated successfully!
✅ Stock added successfully!
```

**Style**: Green background, white text, auto-dismiss in 3 sec

### Error Alert

```
❌ Cost must be greater than 0
❌ Failed to update cost
```

**Style**: Red background, white text, stays visible

### Info Text

```
💡 Cost must be greater than 0. This is required to sell products.
```

**Style**: Teal/info color, inside form

---

## Button Reference

| Button             | Location      | Action                | Style               |
| ------------------ | ------------- | --------------------- | ------------------- |
| Add Stock (Expand) | Form Header   | Toggle form expansion | Teal text           |
| Add Stock (Submit) | Form Bottom   | Submit form           | Teal bg, white text |
| Edit Cost          | Table Row     | Start cost editing    | Teal bg             |
| ✓ (Save)           | Inline Editor | Save cost change      | Teal bg             |
| ✕ (Cancel)         | Inline Editor | Discard edit          | Gray bg             |

---

## Status Badge Reference

### Cost Status (in table)

```
✓ Set       → Green badge (cost configured)
⚠ Missing   → Red badge (cost not set)
```

### Product Status (in table)

```
🟢 Ready      → Green circle (can be sold)
🟡 Incomplete → Yellow circle (needs cost)
```

---

## How Form Collapse Works

### Initial State

- Form is **COLLAPSED** (minimized)
- Only shows header: "▶ Add Stock [Expand]"
- Arrow points right (▶) indicating expandable

### Expanded State

- User clicks header or [Expand] button
- Arrow changes to point down (▼) indicating collapsible
- Full form appears below header
- Button label changes to [Collapse]

### Auto-Close After Success

1. User submits form successfully
2. Success message shows
3. Form automatically collapses
4. Arrow goes back to ▶
5. Table shows updated inventory

---

## Cost Editing Workflow

### Step 1: View Cost in Table

```
Product | Cost
────────────────
Item 1  | ₹50 ✓ Set      ← Current cost visible
Item 2  | Not Set ⚠ Miss ← Needs cost
```

### Step 2: Click "Edit Cost"

```
Product | Cost
────────────────────────
Item 2  | [____] ✓ ✕     ← Input appears
```

### Step 3: Enter New Cost

```
Product | Cost
────────────────────────
Item 2  | [60.00] ✓ ✕    ← Type new value
```

### Step 4: Click ✓ to Save

```
Processing...
↓
✅ Cost updated successfully!
↓
Product | Cost
────────────────────────
Item 2  | ₹60.00 ✓ Set   ← Cost updated
```

---

## Search Dropdown Info

When searching for products in Add Stock form:

```
[Search product...       ] ↓
┌──────────────────────────┐
│ Tempered Glass           │
│ Stock: 4 | Price: ₹100   │
│ Cost: ₹50                │  ← Shows current cost!
├──────────────────────────┤
│ UV Tempered              │
│ Stock: 6 | Price: ₹150   │
│ Cost: Not Set            │  ← Shows missing cost
└──────────────────────────┘
```

---

## Responsive Design

### Desktop

- Full table with all columns visible
- Form expands horizontally
- Inline editing works normally

### Tablet

- Table may scroll horizontally for Cost Price column
- Form adapts to smaller width
- Touch-friendly buttons (larger tap area)

### Mobile

- Table scrolls if needed
- Form collapses to save space (critical on small screens)
- Full-width inputs for easier typing

---

## Dark Mode Support

All new features work in both light and dark themes:

### Light Mode

- White cards with gray borders
- Dark text on light background
- Teal buttons with proper contrast

### Dark Mode

- Dark gray cards with subtle borders
- Light text on dark background
- Teal buttons maintain visibility
- Proper color contrast maintained

---

## Keyboard Shortcuts (Future)

Currently available via mouse/touch. Keyboard shortcuts could include:

| Shortcut | Action          |
| -------- | --------------- |
| Ctrl+K   | Focus search    |
| Escape   | Close dropdown  |
| Enter    | Confirm edit    |
| Tab      | Navigate fields |

---

## Performance Tips

- ✅ Form collapse reduces initial load time
- ✅ Inline editing doesn't reload page
- ✅ Table updates only affected row
- ✅ No unnecessary re-renders

---

## Common User Tasks

### Task 1: Set Cost for Product Without Cost

1. Find product in table with "⚠ Missing" badge
2. Click "Edit Cost" button
3. Enter cost value
4. Click ✓
5. Status changes to "🟢 Ready"
6. ✅ Done

### Task 2: Adjust Cost of Product

1. Find product in table
2. Click "Edit Cost" button
3. Modify cost value
4. Click ✓
5. Success message appears
6. ✅ Done

### Task 3: Add New Stock with Cost

1. Click "▶ Add Stock" to expand
2. Search and select product
3. Enter quantity
4. Enter cost per unit
5. Click "✓ Add Stock"
6. Form collapses automatically
7. Table shows new stock
8. ✅ Done

---

## Success Indicators

✅ **Form Collapse**: Saves vertical space  
✅ **Inline Cost Edit**: Quick updates without navigation  
✅ **Cost Column**: Visibility of product readiness  
✅ **Status Badge**: Clear indication of sellability  
✅ **Visual Feedback**: Icons and colors guide user  
✅ **Auto-Close**: Form collapses after success  
✅ **Real-Time Update**: Changes appear immediately

---

## Troubleshooting

| Issue                | Solution                               |
| -------------------- | -------------------------------------- |
| Form won't collapse  | Refresh page, try clicking arrow again |
| Cost edit not saving | Check cost > 0, network connection     |
| Status not updating  | Refresh page to see latest status      |
| Form always expanded | Close browser dev tools if open        |
