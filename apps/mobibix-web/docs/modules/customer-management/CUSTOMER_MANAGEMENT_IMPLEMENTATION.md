# Customer Management UI - Implementation Summary

## Overview

Complete Customer Management UI for Mobile Shop ERP with CRUD operations, phone lookup, soft-delete, and loyalty points display.

---

## Architecture

### 1. **API Service Layer** (`customers.api.ts`)

- **Location**: `src/services/customers.api.ts`
- **Interfaces**:
  - `Customer`: Read model with id, name, phone, state, gstNumber, loyaltyPoints, isActive, timestamps
  - `CreateCustomerDto`: name, phone, state, gstNumber (optional)
  - `UpdateCustomerDto`: name, state, gstNumber (phone excluded)

- **Functions**:
  - `listCustomers()`: GET `/core/customers` - List all tenant-scoped customers
  - `getCustomer(customerId)`: GET `/core/customers/{id}` - Get single customer
  - `getCustomerByPhone(phone)`: GET `/core/customers/by-phone?phone=xxx` - Lookup existing customer
  - `createCustomer(dto)`: POST `/core/customers` - Create new customer
  - `updateCustomer(customerId, dto)`: PUT `/core/customers/{id}` - Update customer (phone immutable)
  - `deleteCustomer(customerId)`: DELETE `/core/customers/{id}` - Soft-delete (mark inactive)

---

## UI Components

### 2. **Customer List Page** (`customers/page.tsx`)

- **Features**:
  - Table with columns: Name, Phone, State, Loyalty Points, Status, Actions
  - Search functionality (by name or phone)
  - Add/Edit/Delete operations
  - Inactive customers shown as disabled/grayed out
  - Confirmation dialog before delete
  - Loyalty points displayed as badge (purple)
  - Status badge (green=active, red=inactive)
  - Error handling with user-friendly messages
  - Loading state

- **Interactions**:
  - Click "+ Add Customer" button → Opens `CustomerForm` (add mode)
  - Click "Edit" button → Opens `CustomerForm` (edit mode, pre-fills data)
  - Click "Delete" button → Confirmation → Soft-delete via API
  - Search bar filters customers by name/phone
  - Auto-reload after add/edit/delete

---

### 3. **Customer Form Component** (`customers/CustomerForm.tsx`)

- **Reusable Modal** for both Add and Edit modes
- **Form Fields**:
  - Customer Name (required, editable in both modes)
  - Phone Number (required, editable only on create, disabled on edit)
  - State (required, dropdown with 28 Indian states)
  - GST Number (optional)
  - Loyalty Points (read-only if editing)

- **Smart Features**:
  - **Phone Lookup** (add mode only):
    - Auto-checks if phone already exists (debounced 500ms)
    - Shows blue alert if customer with same phone found
    - Suggests reusing existing customer instead of creating duplicate
    - Disables "Add Customer" button if duplicate phone detected
  - **Field Validation**:
    - Required fields: name, phone, state
    - Phone format optional (no validation)
    - GST number optional
  - **API Behavior**:
    - Create: Sends all fields (name, phone, state, gstNumber)
    - Update: Sends only editable fields (name, state, gstNumber) - phone excluded

---

## Key Features

### ✅ Rules Implementation

| Rule                         | Implementation                                        |
| ---------------------------- | ----------------------------------------------------- |
| Phone immutable after create | Phone input disabled in edit mode                     |
| Soft-delete only             | DELETE endpoint marks inactive, no hard delete UI     |
| Loyalty points read-only     | Displayed in edit form as non-editable field          |
| Phone lookup                 | `getCustomerByPhone()` API call with debounce         |
| Duplicate prevention         | Alert when phone already exists, button disabled      |
| OWNER & STAFF both allowed   | No role-based UI restrictions (controlled by backend) |
| No GST calculation           | Form is data entry only, no GST logic                 |

### ✅ UX Improvements

- Search bar for quick customer lookup
- Inactive customers visually distinguished (grayed, strikethrough)
- Loyalty points badge with distinct color
- Status indicators (active/inactive)
- Confirmation dialog before delete
- Error messages with context
- Loading states
- Disabled form button when duplicate phone detected
- Phone immutability hint text on edit form

---

## API Contracts (NOT CHANGED)

All endpoints use tenant-scoped authentication via JWT:

```
POST   /api/core/customers
PUT    /api/core/customers/{customerId}
DELETE /api/core/customers/{customerId}
GET    /api/core/customers/by-phone?phone=xxxx
GET    /api/core/customers  (list all, tenant-scoped)
GET    /api/core/customers/{customerId}  (get one)
```

---

## File Structure

```
apps/mobibix-web/
├── src/services/
│   └── customers.api.ts          (API service, interfaces, HTTP calls)
├── app/(app)/
│   └── customers/
│       ├── page.tsx              (Customer list & table)
│       ├── CustomerForm.tsx       (Reusable add/edit modal)
│       └── layout.tsx             (Layout wrapper)
```

---

## State Management

**List Page**:

- `customers[]`: Array of customer objects
- `isLoading`: Initial data load state
- `isAddModalOpen`: Toggle add modal
- `editingCustomer`: Null or customer being edited
- `error`: Error message display
- `searchTerm`: Filter input for search

**Form Component**:

- `formData`: { name, phone, state, gstNumber }
- `isSaving`: API call state
- `error`: Form-level error
- `phoneExistingCustomer`: Lookup result (add mode only)

---

## Data Flow

### Add Customer Flow:

1. User clicks "+ Add Customer"
2. `isAddModalOpen` → true
3. `CustomerForm` opens (customer prop = null, edit mode = false)
4. Form loads with empty fields
5. User types phone → `getCustomerByPhone()` debounced lookup
6. If exists: show alert, disable submit button
7. If new: submit enabled
8. On submit: `createCustomer(dto)` with POST
9. Success → modal closes, page reloads customers

### Edit Customer Flow:

1. User clicks "Edit" on customer row
2. `editingCustomer` set to that customer
3. `CustomerForm` opens with pre-filled data
4. Phone field disabled (readonly)
5. User can edit: name, state, gstNumber
6. On submit: `updateCustomer(customerId, dto)` with PUT
7. Success → modal closes, page reloads

### Delete Customer Flow:

1. User clicks "Delete" on customer row
2. Confirmation dialog: "Are you sure?" message
3. If confirmed: `deleteCustomer(customerId)` with DELETE
4. Success → customer removed from list (soft-delete on backend)
5. Page auto-reloads customer list

---

## Styling

- **Color Scheme**: Dark stone-900 background, white text, teal-500 primary action
- **Components**:
  - Modal with border and backdrop blur
  - Dark input fields with white/20 borders
  - Status/loyalty badges with context colors
  - Hover states on buttons
  - Disabled states on buttons

---

## Error Handling

- Network errors: "Failed to load customers", etc.
- Validation errors: "Phone is required", etc.
- Duplicate phone: Blue alert (add mode only)
- API errors: Extracted error.message from response JSON
- Form errors: Displayed above form, cleared on successful submit

---

## Notes

1. **Phone Lookup**: Only runs in add mode to prevent duplicates. In edit mode, phone is immutable.
2. **Soft Delete**: Backend marks `isActive = false`. Frontend shows as inactive in table.
3. **Loyalty Points**: Read-only, managed by backend (possibly via transactions/purchases).
4. **State Dropdown**: 28 Indian states pre-loaded (GST context).
5. **Authentication**: Uses `authenticatedFetch()` wrapper which includes JWT token.
6. **Tenant Scope**: All queries are tenant-scoped by backend (JWT payload contains tenantId).

---

## Testing Checklist

- [ ] Load customer list
- [ ] Search customers by name
- [ ] Search customers by phone
- [ ] Add new customer (all fields)
- [ ] Try adding duplicate phone → should show alert
- [ ] Edit customer (name, state, GST)
- [ ] Verify phone disabled on edit
- [ ] Delete customer with confirmation
- [ ] Verify deleted customer marked inactive
- [ ] View loyalty points (read-only)
- [ ] Check inactive customer styling in table
- [ ] Test error messages (invalid state, etc.)
- [ ] Test loading state
- [ ] Verify modal closes on cancel
- [ ] Verify modal reloads list after success
