# Customer Management UI - Quick Reference Guide

## 🚀 Quick Start

### Navigate to Customer Management:

- URL: `http://localhost_REPLACED:3000/customers` (when app is running)
- Sidebar: Click "👥 Customers" icon
- Page title: "Customers - Manage your customer database"

---

## 🔑 Key Features at a Glance

| Feature               | Location             | Trigger                |
| --------------------- | -------------------- | ---------------------- |
| View all customers    | List table           | Page load              |
| Add customer          | Modal form           | Click "+ Add Customer" |
| Edit customer         | Modal form           | Click "Edit" on row    |
| Delete customer       | Confirmation         | Click "Delete" on row  |
| Search customers      | Top search bar       | Type name or phone     |
| View loyalty points   | Table column + badge | Page load              |
| Check customer status | Status column        | Page load              |

---

## 📋 Field Reference

### Customer Name

- **Type**: Text input
- **Required**: Yes
- **Editable**: Yes (add & edit)
- **Max length**: No limit specified

### Phone Number

- **Type**: Text input (tel)
- **Required**: Yes
- **Format**: 10-digit (suggested)
- **Immutable**: After create (disabled on edit)
- **Unique**: Yes (checked via lookup)

### State

- **Type**: Dropdown select
- **Required**: Yes
- **Options**: 28 Indian states + UTs
- **Editable**: Yes (add & edit)
- **Purpose**: GST logic context

### GST Number

- **Type**: Text input
- **Required**: No (optional)
- **Editable**: Yes (add & edit)
- **Format**: Any string (no validation)
- **Example**: "27AABCP1234H1Z0"

### Loyalty Points

- **Type**: Read-only number
- **Editable**: No
- **Visible**: Edit form only
- **Source**: Backend managed
- **Usage**: Customer rewards/tier

---

## 🎯 Common Tasks

### ✏️ Add a New Customer

1. Click "+ Add Customer" button (top right)
2. Fill "Customer Name" (required)
3. Enter "Phone Number" (required, 10 digits)
4. Select "State" from dropdown (required)
5. Optionally enter "GST Number"
6. Click "Add Customer" button
7. Modal closes, list refreshes

**⚠️ If phone exists**: Blue alert shown, "Add Customer" button disabled. Consider reusing existing customer instead.

### ✏️ Edit Existing Customer

1. Find customer in table
2. Click "Edit" button (right side)
3. Modal opens with pre-filled data
4. Edit: Name, State, GST Number
5. **Phone is locked** (cannot change)
6. View "Loyalty Points" (read-only)
7. Click "Update" button
8. Modal closes, list refreshes

### 🗑️ Delete Customer

1. Find customer in table
2. Click "Delete" button (right side)
3. Confirmation dialog appears
4. Confirm action
5. Customer marked as "Inactive"
6. May still appear in list (grayed out)

### 🔍 Search for Customer

1. Type in search bar (top)
2. Search by name: "John Doe"
3. Search by phone: "9876543210"
4. Results filter instantly (client-side)
5. Clear search to see all

---

## 🎨 Visual Indicators

### Status Badges

- **Green "Active"**: Customer is active
- **Red "Inactive"**: Customer soft-deleted (marked inactive)
- **Grayed out row**: Inactive customer (strikethrough name)

### Loyalty Points

- **Purple badge** with "pts" label
- Shows accumulated loyalty points
- Read-only (edited via backend)

### Form States

- **Blue alert**: Phone already exists (add mode only)
- **Red alert**: Validation error
- **Gray disabled**: Phone field on edit
- **Disabled button**: Can't submit if duplicate phone

---

## 🔌 API Endpoints Used

| Method | Endpoint                                 | Purpose                |
| ------ | ---------------------------------------- | ---------------------- |
| POST   | `/api/core/customers`                    | Create customer        |
| GET    | `/api/core/customers`                    | List all customers     |
| GET    | `/api/core/customers/{id}`               | Get single customer    |
| GET    | `/api/core/customers/by-phone?phone=xxx` | Lookup by phone        |
| PUT    | `/api/core/customers/{id}`               | Update customer        |
| DELETE | `/api/core/customers/{id}`               | Delete (soft) customer |

All requests authenticated via JWT token in header.

---

## 📁 Code Structure

```
apps/mobibix-web/
├── src/services/
│   └── customers.api.ts          (API calls + types)
└── app/(app)/customers/
    ├── page.tsx                  (List page)
    ├── CustomerForm.tsx          (Add/Edit modal)
    └── layout.tsx                (Layout)
```

---

## 🐛 Troubleshooting

### Problem: "Failed to load customers"

- Check backend is running (`npm run start:dev` in backend folder)
- Check `NEXT_PUBLIC_API_URL` env var is correct
- Check internet connection
- Check browser console for errors

### Problem: Phone lookup not working

- Wait 500ms (debounce delay) after typing
- Check backend is running
- Check phone number is at least 10 digits

### Problem: Can't edit phone number

- This is intentional! Phone is immutable after creation
- Phone field disabled on edit form
- Hint text explains this

### Problem: Can't add customer with existing phone

- Phone already exists for another customer
- Blue alert shown in form
- Consider editing existing customer instead
- Or contact support if duplicate

### Problem: Deleted customer still visible

- Deleted customers marked as "Inactive"
- Not hard-deleted (soft-delete pattern)
- Shows with "Inactive" badge and grayed out
- Can still be edited if needed

### Problem: Form not submitting

- Check all required fields filled (name, phone, state)
- Check no duplicate phone (add mode)
- Check button is enabled (not grayed out)
- Check browser console for errors

---

## 🔒 Permissions & Rules

| Action          | OWNER | STAFF | Rule                        |
| --------------- | ----- | ----- | --------------------------- |
| View list       | ✅    | ✅    | All users can view          |
| Add customer    | ✅    | ✅    | All users can create        |
| Edit customer   | ✅    | ✅    | All users can edit          |
| Delete customer | ✅    | ✅    | All users can delete (soft) |
| View loyalty    | ✅    | ✅    | All users can see           |
| Edit loyalty    | ❌    | ❌    | Backend only                |

---

## 💡 Best Practices

### ✅ DO:

- Use exact 10-digit phone for consistent lookup
- Fill state correctly (affects GST logic)
- Add GST number if business has GST
- Review customer before deletion
- Use search for quick lookup

### ❌ DON'T:

- Try to edit phone (it's immutable by design)
- Leave required fields empty
- Create duplicate customers with same phone
- Hard-delete customers (soft-delete only)
- Try to edit loyalty points (backend only)

---

## ⚡ Keyboard Shortcuts

- **Tab**: Navigate between form fields
- **Enter**: Submit form (when focused)
- **Escape**: Close modal (if implemented)

---

## 📊 Table Columns Explained

| Column         | Content             | Purpose            |
| -------------- | ------------------- | ------------------ |
| Name           | Customer full name  | Identification     |
| Phone          | 10-digit phone      | Contact info       |
| State          | Indian state        | GST determination  |
| Loyalty Points | Accumulated points  | Reward tracking    |
| Status         | Active/Inactive     | Lifecycle tracking |
| Actions        | Edit/Delete buttons | Operations         |

---

## 🔄 Data Flow

```
User Action
    ↓
Form Component (Add/Edit)
    ↓
Validate locally (required fields, duplicates)
    ↓
API Call (customers.api.ts)
    ↓
Backend API (/api/core/customers)
    ↓
Validate & persist on backend
    ↓
Return response
    ↓
List page reloads
    ↓
Display updated data
```

---

## 📱 Mobile Experience

- Form stacks vertically on mobile
- Table becomes horizontally scrollable
- Search bar full-width
- Buttons remain accessible
- Modal adjusts to viewport

---

## 🔗 Related Features

### Sales Invoices

- Can lookup customer by phone before creating invoice
- Uses `getCustomerByPhone()` function

### Job Cards

- Can associate customer with job

### Analytics

- Can filter by customer loyalty tier

---

## 📞 Support & Help

- **Backend Down**: Customers page shows "Failed to load customers"
- **API Error**: Error message displayed in red banner
- **Duplicate Phone**: Blue alert explains and prevents submission
- **Field Validation**: Required fields marked with red asterisk (\*)

---

## Version Info

- **Component**: Customer Management v1.0
- **Build Date**: January 24, 2026
- **Status**: Production Ready ✅

---

## 📚 Documentation Files

Read more detailed docs:

- `CUSTOMER_MANAGEMENT_IMPLEMENTATION.md` - Full architecture
- `CUSTOMER_MANAGEMENT_VISUAL_REFERENCE.md` - UI mockups & layouts
- `CUSTOMER_MANAGEMENT_CODE_EXAMPLES.md` - Code snippets & patterns
- `CUSTOMER_MANAGEMENT_BUILD_VERIFICATION.md` - Complete checklist

---

**Last Updated**: January 24, 2026
**Maintainer**: Development Team
