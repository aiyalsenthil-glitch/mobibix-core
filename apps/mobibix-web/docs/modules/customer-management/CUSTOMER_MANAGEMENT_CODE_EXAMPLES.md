# Customer Management - Code Examples & Usage Guide

## 1. API Service Usage

### Import the service:

```typescript
import {
  listCustomers,
  getCustomer,
  getCustomerByPhone,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  type Customer,
  type CreateCustomerDto,
  type UpdateCustomerDto,
} from "@/services/customers.api";
```

### List all customers:

```typescript
const customers = await listCustomers();
// Returns: Customer[]
// Sorted by creation date (backend)
```

### Get single customer:

```typescript
const customer = await getCustomer("customer-id-123");
// Returns: Customer with full details
```

### Lookup customer by phone:

```typescript
const existing = await getCustomerByPhone("9876543210");
// Returns: Customer | null
// Useful for preventing duplicates before create
```

### Create new customer:

```typescript
const newCustomer = await createCustomer({
  name: "John Doe",
  phone: "9876543210",
  state: "Maharashtra",
  gstNumber: "27AABCP1234H1Z0", // optional
});
// Returns: Customer (with id, loyaltyPoints: 0, isActive: true)
```

### Update customer:

```typescript
const updated = await updateCustomer("customer-id-123", {
  name: "John Smith", // can change
  state: "Karnataka", // can change
  gstNumber: undefined, // can change/remove
  // NOTE: phone is NOT in UpdateCustomerDto - immutable
});
// Returns: Customer (updated)
```

### Delete customer (soft-delete):

```typescript
await deleteCustomer("customer-id-123");
// Sets isActive: false on backend
// No return value on success
```

---

## 2. Component Usage

### Use list page:

```typescript
// Navigate to /customers
// Shows all customers in table with search

import CustomersPage from "@/app/(app)/customers/page";
// <CustomersPage /> renders full page
```

### Use form component:

```typescript
import { CustomerForm } from "@/app/(app)/customers/CustomerForm";

// Add mode:
<CustomerForm customer={null} onClose={handleClose} />

// Edit mode:
<CustomerForm customer={customerData} onClose={handleClose} />
```

---

## 3. Integration in Other Pages

### Example: Sales Invoice - Customer Lookup

```typescript
"use client";

import { useState } from "react";
import { getCustomerByPhone } from "@/services/customers.api";

export function SalesInvoiceForm() {
  const [customerPhone, setCustomerPhone] = useState("");
  const [foundCustomer, setFoundCustomer] = useState(null);

  const handlePhoneLookup = async (phone: string) => {
    try {
      const customer = await getCustomerByPhone(phone);
      setFoundCustomer(customer); // null if not found
    } catch (err) {
      console.error("Lookup failed:", err);
    }
  };

  return (
    <div>
      <input
        value={customerPhone}
        onChange={(e) => {
          setCustomerPhone(e.target.value);
          if (e.target.value.length === 10) {
            handlePhoneLookup(e.target.value);
          }
        }}
        placeholder="Enter phone to lookup customer"
      />

      {foundCustomer && (
        <div>
          <p>Found: {foundCustomer.name}</p>
          <p>Loyalty Points: {foundCustomer.loyaltyPoints}</p>
          <p>State: {foundCustomer.state}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 4. Form Validation Examples

### Customer Name:

```typescript
const [name, setName] = useState("");

const isNameValid = name.trim().length > 0;
// Required, non-empty
```

### Phone Number:

```typescript
const [phone, setPhone] = useState("");

const isPhoneValid = phone.trim().length > 0;
// Required
// Format validation optional (backend validates)

// Check for duplicates (add mode):
const existing = await getCustomerByPhone(phone);
if (existing && !isEditing) {
  setError(`Customer with phone ${phone} already exists`);
}
```

### State:

```typescript
const [state, setState] = useState("");

const isStateValid = INDIAN_STATES.includes(state);
// Must be from predefined list
```

### GST Number:

```typescript
const [gstNumber, setGstNumber] = useState("");

// Optional - can be empty or any string
// No format validation in frontend (backend validates if needed)
```

---

## 5. Error Handling Patterns

### Network errors:

```typescript
try {
  const customers = await listCustomers();
} catch (err: any) {
  setError(err.message || "Failed to load customers");
  // Backend returns: { message: "...", statusCode: ... }
}
```

### Duplicate phone (add mode):

```typescript
const existing = await getCustomerByPhone(phone);
if (existing && !isEditing) {
  throw new Error(
    `A customer with phone ${phone} already exists: ${existing.name}`,
  );
}
```

### Validation errors:

```typescript
if (!name.trim()) {
  setError("Customer name is required");
  return; // Prevent submission
}
```

### Update errors:

```typescript
try {
  await updateCustomer(customerId, formData);
  onClose(); // Reload parent
} catch (err: any) {
  setError(err.message || "Failed to update customer");
}
```

---

## 6. Type Definitions

### Customer interface:

```typescript
interface Customer {
  id: string; // CUID primary key
  name: string; // Full name
  phone: string; // 10-digit phone (immutable)
  state: string; // Indian state (GST context)
  gstNumber?: string; // Optional GST identifier
  loyaltyPoints: number; // Read-only, managed by backend
  isActive: boolean; // false = soft-deleted
  createdAt: string | Date;
  updatedAt: string | Date;
}
```

### Create DTO:

```typescript
interface CreateCustomerDto {
  name: string; // Required
  phone: string; // Required, immutable
  state: string; // Required
  gstNumber?: string; // Optional
}
```

### Update DTO:

```typescript
interface UpdateCustomerDto {
  name: string; // Can change
  state: string; // Can change
  gstNumber?: string; // Can change
  // phone is NOT here - immutable after create
}
```

---

## 7. State Management Pattern

### List page state:

```typescript
const [customers, setCustomers] = useState<Customer[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [isAddModalOpen, setIsAddModalOpen] = useState(false);
const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
const [error, setError] = useState<string | null>(null);
const [searchTerm, setSearchTerm] = useState("");

// Load effect:
useEffect(() => {
  const load = async () => {
    try {
      const data = await listCustomers();
      setCustomers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  load();
}, []);

// Filtered customers:
const filtered = customers.filter(
  (c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm),
);
```

### Form state:

```typescript
const [formData, setFormData] = useState({
  name: customer?.name || "",
  phone: customer?.phone || "",
  state: customer?.state || "",
  gstNumber: customer?.gstNumber || "",
});
const [isSaving, setIsSaving] = useState(false);
const [error, setError] = useState<string | null>(null);
const [phoneExistingCustomer, setPhoneExistingCustomer] =
  useState<Customer | null>(null);
```

---

## 8. Phone Lookup Debounce Pattern

```typescript
useEffect(() => {
  if (!isEditing && formData.phone.trim()) {
    // Debounce phone lookup
    const validatePhone = async () => {
      try {
        const existing = await getCustomerByPhone(formData.phone);
        setPhoneExistingCustomer(existing);
      } catch {
        setPhoneExistingCustomer(null);
      }
    };

    // Set timeout for 500ms debounce
    const timeoutId = setTimeout(validatePhone, 500);

    // Cleanup: cancel pending lookup if user types again
    return () => clearTimeout(timeoutId);
  }
}, [formData.phone, isEditing]);
```

---

## 9. API Endpoint Contracts

### POST /api/core/customers

**Request:**

```json
{
  "name": "John Doe",
  "phone": "9876543210",
  "state": "Maharashtra",
  "gstNumber": "27AABCP1234H1Z0"
}
```

**Response (201):**

```json
{
  "id": "clvr8s4z9...",
  "name": "John Doe",
  "phone": "9876543210",
  "state": "Maharashtra",
  "gstNumber": "27AABCP1234H1Z0",
  "loyaltyPoints": 0,
  "isActive": true,
  "createdAt": "2024-01-24T10:30:00Z",
  "updatedAt": "2024-01-24T10:30:00Z"
}
```

### PUT /api/core/customers/{customerId}

**Request:**

```json
{
  "name": "John Smith",
  "state": "Karnataka",
  "gstNumber": null
}
```

**Response (200):**

```json
{
  "id": "clvr8s4z9...",
  "name": "John Smith",
  "phone": "9876543210",
  "state": "Karnataka",
  "gstNumber": null,
  "loyaltyPoints": 0,
  "isActive": true,
  "createdAt": "2024-01-24T10:30:00Z",
  "updatedAt": "2024-01-24T11:00:00Z"
}
```

### DELETE /api/core/customers/{customerId}

**Response (200/204):**

- No body, sets `isActive: false` on backend

### GET /api/core/customers/by-phone?phone=9876543210

**Response (200):**

```json
{
  "id": "clvr8s4z9...",
  "name": "John Doe",
  "phone": "9876543210",
  "state": "Maharashtra",
  "gstNumber": "27AABCP1234H1Z0",
  "loyaltyPoints": 150,
  "isActive": true,
  "createdAt": "2024-01-24T10:30:00Z",
  "updatedAt": "2024-01-24T10:30:00Z"
}
```

**Response (404):**

- Customer not found

---

## 10. Testing Examples

### Test Add Customer:

```typescript
// 1. Click "+ Add Customer"
fireEvent.click(screen.getByText("+ Add Customer"));

// 2. Fill form
fireEvent.change(screen.getByPlaceholderText("Enter customer name"), {
  target: { value: "John Doe" },
});
fireEvent.change(screen.getByPlaceholderText("Enter 10-digit phone"), {
  target: { value: "9876543210" },
});

// 3. Select state
fireEvent.change(screen.getByDisplayValue("-- Select State --"), {
  target: { value: "Maharashtra" },
});

// 4. Submit
fireEvent.click(screen.getByText("Add Customer"));

// 5. Verify API call and list update
await waitFor(() => {
  expect(screen.getByText("John Doe")).toBeInTheDocument();
});
```

### Test Edit Customer:

```typescript
// 1. Click Edit
fireEvent.click(screen.getAllByText("Edit")[0]);

// 2. Verify form pre-filled
expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();

// 3. Verify phone disabled
expect(screen.getByDisplayValue("9876543210")).toBeDisabled();

// 4. Change state
fireEvent.change(screen.getByDisplayValue("Maharashtra"), {
  target: { value: "Karnataka" },
});

// 5. Submit
fireEvent.click(screen.getByText("Update"));

// 6. Verify update
await waitFor(() => {
  expect(screen.getByText("Karnataka")).toBeInTheDocument();
});
```

### Test Delete Customer:

```typescript
// 1. Click Delete
fireEvent.click(screen.getAllByText("Delete")[0]);

// 2. Confirm dialog
fireEvent.click(screen.getByText("OK")); // or use window.confirm mock

// 3. Verify removed from list
await waitFor(() => {
  expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
});
```

---

## 11. Common Patterns

### Reusing form for add/edit:

```typescript
{(isAddModalOpen || editingCustomer) && (
  <CustomerForm
    customer={editingCustomer}  // null for add, Customer for edit
    onClose={handleFormClose}
  />
)}
```

### Conditional field disabling:

```typescript
<input
  disabled={isEditing}  // Phone disabled on edit
  className={isEditing ? "opacity-60 cursor-not-allowed" : ""}
/>
```

### Read-only field display:

```typescript
{isEditing && customer && (
  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded">
    {customer.loyaltyPoints} points
  </div>
)}
```

### Preventing duplicates:

```typescript
disabled={isSaving || (!isEditing && phoneExistingCustomer !== null)}
```

---

## 12. Alignment with Backend Rules

### Backend enforces:

- ✅ Tenant-scoping (JWT token)
- ✅ Phone immutability (PUT DTO excludes phone)
- ✅ Soft-delete (isActive flag)
- ✅ Loyalty points read-only (not in UpdateCustomerDto)
- ✅ GST state context (state field required)

### Frontend enforces:

- ✅ Phone lookup to prevent duplicates
- ✅ Phone field disabled on edit
- ✅ Loyalty points displayed read-only
- ✅ Form validation (required fields)
- ✅ Confirmation before delete
- ✅ Proper error messaging
