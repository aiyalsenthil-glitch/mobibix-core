# Customer Management UI - Build Verification Checklist

## ✅ Implementation Complete

### Files Created:

- ✅ `src/services/customers.api.ts` - API service layer
- ✅ `app/(app)/customers/page.tsx` - Customer list page
- ✅ `app/(app)/customers/CustomerForm.tsx` - Reusable form component
- ✅ `app/(app)/customers/layout.tsx` - Layout wrapper

---

## Requirements Verification

### API Layer (`customers.api.ts`)

- ✅ Uses existing endpoints (NOT changed)
- ✅ POST `/api/core/customers` - createCustomer()
- ✅ PUT `/api/core/customers/{customerId}` - updateCustomer()
- ✅ DELETE `/api/core/customers/{customerId}` - deleteCustomer()
- ✅ GET `/api/core/customers/by-phone?phone=xxxx` - getCustomerByPhone()
- ✅ GET `/api/core/customers` - listCustomers()
- ✅ GET `/api/core/customers/{customerId}` - getCustomer()
- ✅ Type interfaces: Customer, CreateCustomerDto, UpdateCustomerDto
- ✅ Uses authenticatedFetch() for JWT auth

### Data Model

- ✅ id - Customer primary key
- ✅ name - Full name, editable
- ✅ phone - 10-digit, immutable after create
- ✅ state - Mandatory, for GST logic
- ✅ gstNumber - Optional field
- ✅ loyaltyPoints - Read-only, displayed only
- ✅ isActive - Boolean for soft-delete tracking

### Business Rules

- ✅ **Phone immutable**: Disabled on edit form, excluded from UpdateCustomerDto
- ✅ **Soft-delete only**: DELETE API marks inactive, no hard delete UI
- ✅ **Loyalty points read-only**: Not editable, shown as badge in list, displayed in edit form
- ✅ **Phone lookup**: getCustomerByPhone() with debounce (500ms)
- ✅ **Duplicate prevention**: Alert shown, button disabled if phone exists
- ✅ **OWNER & STAFF**: No role restrictions (backend enforces)
- ✅ **No GST calculation**: Form is pure data entry

### Customer List Page Features

- ✅ Table with columns: Name, Phone, State, Loyalty Points, Status, Actions
- ✅ Search by name or phone (real-time filtering)
- ✅ Edit button (opens form in edit mode)
- ✅ Delete button (with confirmation)
- ✅ Add Customer button (opens form in add mode)
- ✅ Inactive customers styled as disabled (strikethrough, grayed)
- ✅ Status badges: Active (green), Inactive (red)
- ✅ Loyalty points badge: Purple with "pts" label
- ✅ Error handling with user messages
- ✅ Loading state display
- ✅ Empty state messages
- ✅ Auto-reload after add/edit/delete

### Add Customer Form Features

- ✅ Form title: "Add New Customer"
- ✅ Customer Name: Required text input, editable
- ✅ Phone Number: Required text input, editable only on create
- ✅ State: Required dropdown (28 Indian states)
- ✅ GST Number: Optional text input
- ✅ Phone lookup: Debounced, shows existing customer alert
- ✅ Duplicate prevention: "Customer exists!" blue alert shown
- ✅ Submit button disabled if duplicate phone
- ✅ Form validation for required fields
- ✅ Cancel button (closes without saving)
- ✅ Submit button: "Add Customer" label
- ✅ Error message display

### Edit Customer Form Features

- ✅ Form title: "Edit Customer"
- ✅ Customer Name: Required, editable
- ✅ Phone Number: Disabled, immutable (grayed, hint text shown)
- ✅ State: Required, editable
- ✅ GST Number: Optional, editable
- ✅ Loyalty Points: Read-only field display (not editable)
- ✅ No phone lookup (phone immutable)
- ✅ Form validation for required fields
- ✅ Cancel button (closes without saving)
- ✅ Submit button: "Update" label
- ✅ Error message display

### UX Features

- ✅ Reused same form for Add & Edit (via CustomerForm component)
- ✅ Confirmation dialog before delete
- ✅ Modal overlay for form (fixed position)
- ✅ Modal close button (✕)
- ✅ Search bar for quick lookup
- ✅ Inactive customers visually distinguished
- ✅ Loading states on buttons
- ✅ Error messages with context
- ✅ Empty state guidance
- ✅ State dropdown with 28 options (GST context)

### State Management

- ✅ List page: customers[], isLoading, isAddModalOpen, editingCustomer, error, searchTerm
- ✅ Form: formData (name, phone, state, gstNumber), isSaving, error, phoneExistingCustomer
- ✅ Phone lookup debounce (500ms timeout with cleanup)
- ✅ Error state handled separately from loading state

### API Integration

- ✅ listCustomers() - Load all customers on page mount
- ✅ getCustomerByPhone() - Debounced lookup on phone change (add mode)
- ✅ createCustomer() - Submit form with all fields
- ✅ updateCustomer() - Submit form with editable fields only (phone excluded)
- ✅ deleteCustomer() - Soft-delete with confirmation
- ✅ Proper error handling and user feedback
- ✅ Loading states on API calls

### Styling & Design

- ✅ Dark theme: stone-950 background, white text, teal-500 primary
- ✅ Modal layout: fixed overlay, centered card, sticky header
- ✅ Table design: bordered, REMOVED_PAYMENT_INFRAd rows, sortable appearance
- ✅ Button styles: teal primary, blue edit, red delete, gray secondary
- ✅ Badge styles: purple loyalty, green active, red inactive
- ✅ Input styles: dark background, light borders, focus highlights
- ✅ Responsive: Mobile-friendly with adjustable widths
- ✅ Hover states on interactive elements
- ✅ Disabled states on buttons (reduced opacity)
- ✅ Alert boxes: red for errors, blue for info

### Error Handling

- ✅ Network errors: Caught and displayed
- ✅ Validation errors: Field-level feedback
- ✅ Duplicate phone: Alert shown, submit disabled
- ✅ Not found: Graceful handling (404 → null)
- ✅ API errors: Message extracted and displayed
- ✅ Form errors: Cleared on success

### Browser Compatibility

- ✅ Uses standard Fetch API (via authenticatedFetch wrapper)
- ✅ React Hooks (useState, useEffect)
- ✅ CSS modules (Tailwind classes)
- ✅ Next.js App Router (client component)

---

## Pages Structure

```
app/(app)/customers/
├── page.tsx              (Customer List - main page)
├── CustomerForm.tsx      (Reusable Add/Edit modal)
└── layout.tsx            (Layout wrapper)
```

**Entry Point**: `/customers` → Shows customer list with add/edit/delete operations

---

## File Sizes & Metrics

| File               | Lines | Purpose             |
| ------------------ | ----- | ------------------- |
| customers.api.ts   | ~141  | API service + types |
| customers/page.tsx | ~221  | List page + table   |
| CustomerForm.tsx   | ~280+ | Reusable form       |
| layout.tsx         | ~8    | Layout wrapper      |

**Total**: ~650 lines of frontend code

---

## Integration Points

### Existing Services Used:

- ✅ `authenticatedFetch()` from `@/services/auth.api` - Handles JWT auth
- ✅ React hooks (useState, useEffect) - State management
- ✅ Next.js useRouter, useParams - Navigation
- ✅ Tailwind CSS - Styling

### No modifications to:

- ✅ Backend APIs (all endpoints pre-existing)
- ✅ Auth system
- ✅ Other modules

---

## Testing Scenarios

### Add Customer Flow:

```
1. Click "+ Add Customer"
2. Fill name, phone, state
3. Phone lookup validates (no duplicate)
4. Submit → POST /api/core/customers
5. Modal closes, list reloads
6. New customer appears in table
```

### Edit Customer Flow:

```
1. Click "Edit" on customer
2. Form pre-fills with customer data
3. Phone field disabled (immutable)
4. Edit name, state, GST
5. Submit → PUT /api/core/customers/{id}
6. Modal closes, list reloads
7. Updated values appear in table
```

### Delete Customer Flow:

```
1. Click "Delete" on customer
2. Confirmation: "Are you sure?"
3. Confirm → DELETE /api/core/customers/{id}
4. Customer removed from list (marked inactive)
5. May appear as grayed/strikethrough if shown
```

### Phone Lookup Flow:

```
1. In "Add New Customer" form
2. Enter 10 digits in phone field
3. 500ms debounce → getCustomerByPhone()
4. If found: Show blue alert "Customer exists!"
5. If not found: No alert shown
6. Submit button disabled if duplicate
```

### Search Flow:

```
1. Type in search bar
2. Real-time filter by name OR phone
3. Table updates instantly (client-side)
4. Empty state if no matches
```

---

## Deployment Checklist

- ✅ All TypeScript types properly defined
- ✅ No `any` types used
- ✅ Error boundaries handled
- ✅ Loading states implemented
- ✅ Responsive design verified
- ✅ Accessibility basic (semantic HTML, labels)
- ✅ No hardcoded URLs (uses API_BASE_URL env var)
- ✅ No console errors expected
- ✅ Lint-compliant code
- ✅ Formatted code (Prettier)

---

## Known Limitations & Design Decisions

1. **Phone Format Validation**: Not enforced in frontend (backend validates)
2. **GST Number Format**: Not validated in frontend (optional field)
3. **Loyalty Points Management**: Purely read-only display (business logic in backend)
4. **Soft Delete Display**: Inactive customers stay in list (marked as inactive)
5. **Hard Delete**: Not available in UI (soft-delete only via isActive flag)
6. **Tenant Scoping**: Enforced by backend (JWT contains tenantId)
7. **Role-based Access**: No UI restrictions (backend enforces OWNER/STAFF permissions)
8. **Phone Immutability**: Enforced by excluding from UpdateCustomerDto
9. **Search**: Client-side only (doesn't hit backend)
10. **Sorting**: List order determined by backend response

---

## Future Enhancement Ideas

1. **Bulk Import**: CSV upload for customer list
2. **Loyalty Redemption**: UI to redeem points (backend logic)
3. **Customer Segmentation**: Filter by GST status, state, loyalty tier
4. **Activity History**: Track customer transactions
5. **Export**: Download customer list as CSV/PDF
6. **Advanced Search**: Filter by state, GST status, date range
7. **Duplicate Detection**: Smart matching before create
8. **Customer Groups**: Assign customers to groups/segments
9. **Integration with Sales**: Auto-populate customer in invoices
10. **Communication**: Send messages/offers to customers

---

## Summary

✅ **Complete Customer Management UI** with:

- 100% API contract compliance (existing endpoints)
- All business rules enforced (immutable phone, soft-delete, read-only loyalty)
- Smart phone lookup with duplicate prevention
- Reusable form for add/edit operations
- Comprehensive error handling
- Professional dark-themed UI
- Mobile-responsive design
- Full CRUD operations with confirmation dialogs

**Status**: Ready for testing and deployment
