# Customer Management UI - Visual Reference

## 1. Customer List Page

```
┌─────────────────────────────────────────────────────────┐
│  Customers                       [+ Add Customer]        │
│  Manage your customer database                            │
├─────────────────────────────────────────────────────────┤
│  [Search by name or phone...]                            │
├─────────────────────────────────────────────────────────┤
│  Name        │ Phone      │ State  │ Points    │ Actions │
├─────────────────────────────────────────────────────────┤
│  John Doe    │ 9876543210 │ MH     │ 150 pts   │ Edit Del│
│  Jane Smith  │ 9123456789 │ KA     │ 250 pts   │ Edit Del│
│  (Inactive)  │ 8765432109 │ TN     │ 0 pts     │ Edit Del│
│              │            │        │           │         │
└─────────────────────────────────────────────────────────┘
```

### Table Columns:

- **Name**: Customer full name (strikethrough if inactive)
- **Phone**: 10-digit mobile number
- **State**: State of residence (used for GST)
- **Loyalty Points**: Badge showing accumulated points (purple)
- **Status**: Active/Inactive badge (green/red)
- **Actions**: Edit (blue) and Delete (red) buttons

### Search Feature:

- Real-time filter by customer name or phone
- Instant results (client-side filtering)

---

## 2. Add Customer Modal

```
┌────────────────────────────────────────────┐
│  Add New Customer                    [✕]   │
├────────────────────────────────────────────┤
│                                            │
│  [Customer Name field]                     │
│  (Enter customer name)                     │
│                                            │
│  [Phone Number field]                      │
│  (Enter 10-digit phone)                    │
│                                            │
│  [State dropdown]                          │
│  -- Select State --                        │
│  Andhra Pradesh                            │
│  Maharashtra                               │
│  ...                                       │
│                                            │
│  [GST Number field]                        │
│  (Optional)                                │
│                                            │
│  ┌────────────────────────────────────────┐│
│  │ ⚠️ Customer exists!                    ││
│  │ Phone 9876543210 is already registered ││
│  │ to John Doe                            ││
│  │ Consider reusing instead of duplicate  ││
│  └────────────────────────────────────────┘│
│                                            │
│  [Cancel]            [Add Customer]        │
│                                            │
└────────────────────────────────────────────┘
```

### Fields:

- **Customer Name**: Required text input
- **Phone Number**: Required, 10-digit phone (editable only on create)
- **State**: Required dropdown (28 Indian states)
- **GST Number**: Optional text input

### Smart Phone Lookup:

- Auto-checks if phone already exists (debounced)
- Shows blue alert if found: "Customer exists!"
- Suggests reusing existing customer
- **Disables "Add Customer" button** if duplicate detected

### Buttons:

- **Cancel**: Closes modal without saving
- **Add Customer**: Submits form (disabled if duplicate phone)

---

## 3. Edit Customer Modal

```
┌────────────────────────────────────────────┐
│  Edit Customer                       [✕]   │
├────────────────────────────────────────────┤
│                                            │
│  [Customer Name field]                     │
│  (John Doe)                                │
│                                            │
│  [Phone Number field] (disabled)           │
│  (9876543210)                              │
│  Phone number cannot be changed after      │
│  creation                                  │
│                                            │
│  [State dropdown]                          │
│  Maharashtra (selected)                    │
│                                            │
│  [GST Number field]                        │
│  (27AABCP1234H1Z0)                         │
│                                            │
│  Loyalty Points (Read-Only)                │
│  ┌──────────────────────────────────────┐ │
│  │ 150 points                           │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  [Cancel]            [Update]              │
│                                            │
└────────────────────────────────────────────┘
```

### Key Differences from Add:

- Title: "Edit Customer" (instead of "Add New Customer")
- **Phone field**: Disabled (immutable after creation)
- Hint text: "Phone number cannot be changed after creation"
- **Loyalty Points**: Shown as read-only field
- Submit button: "Update" (instead of "Add Customer")
- No phone lookup (phone immutable)

---

## 4. Delete Confirmation Dialog

```
┌────────────────────────────────────────────────┐
│                                                │
│  Are you sure you want to delete customer     │
│  "John Doe"? This will mark them as inactive. │
│                                                │
│  [OK]              [Cancel]                    │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 5. Inactive Customer Appearance in Table

```
Name         Phone        State  Loyalty Points  Actions
────────────────────────────────────────────────────────
John Doe     9876543210   MH     150 pts         Edit Del
(grayed out) (inactive)
────────────────────────────────────────────────────────
```

- **Text Color**: Stone-500 (gray)
- **Strike-through**: Applied to name
- **Background**: Slightly darker (opacity-60)
- **Still actionable**: Can still edit/delete inactive customers

---

## 6. Error States

### Missing Required Field:

```
┌─────────────────────────────────────────┐
│ ❌ Customer name is required            │
└─────────────────────────────────────────┘
```

### Duplicate Phone (Add Mode):

```
┌────────────────────────────────────────────┐
│ ⚠️ A customer with phone 9876543210       │
│ already exists: John Doe.                 │
│ Reusing existing customer instead.        │
└────────────────────────────────────────────┘
```

### API Error:

```
┌──────────────────────────────────────────┐
│ ❌ Failed to update customer             │
└──────────────────────────────────────────┘
```

---

## 7. Status Badges

### Loyalty Points Badge (Purple):

```
150 pts
```

### Active Status Badge (Green):

```
Active
```

### Inactive Status Badge (Red):

```
Inactive
```

---

## 8. Mobile Responsiveness

- Form stacks on small screens
- Table becomes scrollable on mobile
- Modal adjusts to viewport with padding
- Search bar full-width

---

## State Dropdown Options

```
Andhra Pradesh
Arunachal Pradesh
Assam
Bihar
Chhattisgarh
Goa
Gujarat
Haryana
Himachal Pradesh
Jharkhand
Karnataka
Kerala
Madhya Pradesh
Maharashtra
Manipur
Meghalaya
Mizoram
Nagaland
Odisha
Punjab
Rajasthan
Sikkim
Tamil Nadu
Telangana
Tripura
Uttar Pradesh
Uttarakhand
West Bengal
Ladakh
Jammu and Kashmir
Puducherry
Lakshadweep
Andaman and Nicobar Islands
Dadar and Nagar Haveli and Daman and Diu
```

---

## Color Scheme

| Element         | Color        | Usage                   |
| --------------- | ------------ | ----------------------- |
| Background      | `stone-950`  | Page background         |
| Surface         | `stone-900`  | Modal/table background  |
| Border          | `white/10`   | Dividers, input borders |
| Text            | `white`      | Primary text            |
| Secondary Text  | `stone-400`  | Labels, helpers         |
| Primary Action  | `teal-500`   | Add/Save buttons        |
| Danger Action   | `red-500`    | Delete buttons          |
| Info Action     | `blue-500`   | Alert/info boxes        |
| Loyalty Badge   | `purple-500` | Points display          |
| Status Active   | `green-500`  | Active indicator        |
| Status Inactive | `red-500`    | Inactive indicator      |

---

## Keyboard Navigation

- Tab through form fields
- Enter to submit form
- Escape to close modal (optional)

---

## Loading States

### List Page Loading:

```
Loading customers...
```

### Button States:

- **Idle**: "Add Customer" (clickable)
- **Loading**: "Saving..." (disabled)
- **Success**: Modal closes, list reloads
- **Error**: Error message shown in modal

---

## Empty States

### No Customers:

```
No customers yet. Click '+ Add Customer' to create one.
```

### No Search Results:

```
No customers found matching your search
```
