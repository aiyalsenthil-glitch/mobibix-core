// SIDEBAR STRUCTURE - BEFORE & AFTER

// ❌ BEFORE:
const navItems = [
{ label: "Dashboard", href: "/dashboard", icon: "📊" },
{ label: "Sales", href: "/sales", icon: "💰" },
{ label: "Job Cards", href: "/jobcards", icon: "🔧" },
{ label: "Products", href: "/products", icon: "🏷️" },
{ label: "Inventory", href: "/inventory", icon: "📦", submenu: [...] },
{ label: "Customers", href: "/customers", icon: "👥" }, // ← Simple link
{ label: "Suppliers", href: "/suppliers", icon: "🚚" },
// ... rest
];

// ✅ AFTER:
const navItems = [
{ label: "Dashboard", href: "/dashboard", icon: "📊" },
{ label: "Sales", href: "/sales", icon: "💰" },
{ label: "Job Cards", href: "/jobcards", icon: "🔧" },
{ label: "Products", href: "/products", icon: "🏷️" },
{ label: "Inventory", href: "/inventory", icon: "📦", submenu: [...] },
{
label: "Customers",
href: "/dashboard/customers",
icon: "👥",
submenu: [ // ← NEW: CRM submenu
{ label: "All Customers", href: "/dashboard/customers" },
{ label: "CRM Dashboard", href: "/dashboard/crm" },
{ label: "My Follow-ups", href: "/dashboard/crm/follow-ups" },
{ label: "Customer Timeline", href: "/dashboard/crm/timeline" },
]
},
{ label: "Suppliers", href: "/suppliers", icon: "🚚" },
// ... rest
];

// ==========================================
// FILES CREATED
// ==========================================

// 1. PAGES (Routes)
app/dashboard/crm/page.tsx // CRM Dashboard page
app/dashboard/crm/follow-ups/page.tsx // My Follow-ups page  
app/dashboard/crm/timeline/page.tsx // Customer Timeline page

// 2. DOCUMENTATION
SIDEBAR_CRM_INTEGRATION.md // This file - complete reference

// ==========================================
// SIDEBAR MENU VISUAL
// ==========================================

📊 Dashboard
💰 Sales
🔧 Job Cards
📦 Inventory
├─ Stock Management
├─ Negative Stock Report
└─ Stock Correction
👥 Customers ▼ ← EXPANDABLE
├─ All Customers
├─ CRM Dashboard ← NEW
├─ My Follow-ups ← NEW
└─ Customer Timeline ← NEW
🚚 Suppliers
📥 Purchases
💳 Payments
├─ Receipts
└─ Vouchers
📈 Reports
🏪 Shops
⚙️ Settings
├─ General
└─ Document Numbering

// ==========================================
// CRM PAGES & THEIR COMPONENTS
// ==========================================

PAGE: /dashboard/crm
├─ Header: "CRM Dashboard"
└─ CrmDashboardWidgets
├─ Total Customers card
├─ Follow-ups Due card
├─ Outstanding Amount card
├─ Loyalty Points card
├─ WhatsApp Success card
└─ Top Customers card

PAGE: /dashboard/crm/follow-ups
├─ Header: "My Follow-ups" + "Add Follow-up" button
├─ MyFollowUpsWidget
│ ├─ Overdue section (with red badge)
│ ├─ Due Today section (with yellow badge)
│ ├─ Upcoming section
│ └─ "Mark Done" buttons on each task
└─ AddFollowUpModal (triggered by "Add Follow-up" button)

PAGE: /dashboard/crm/timeline
├─ Header: "Customer Timeline"
├─ Customer ID Input (search field)
└─ CustomerTimeline (if ID entered)
├─ Filter buttons: All, JOB, INVOICE, CRM, WHATSAPP
└─ Timeline items with icons and timestamps

// ==========================================
// USER INTERACTION FLOW
// ==========================================

User clicks "Customers" menu
↓
Submenu expands (if not already expanded)
├─ "All Customers" → /dashboard/customers
├─ "CRM Dashboard" → /dashboard/crm
│ ↓
│ Shows: Total customers, follow-ups due, outstanding amount, loyalty, whatsapp stats
│ Can: Refresh data, view top customers
│
├─ "My Follow-ups" → /dashboard/crm/follow-ups
│ ↓
│ Shows: Overdue tasks (red), Today tasks (yellow), Upcoming tasks
│ Can: Mark tasks done, add new follow-up
│
└─ "Customer Timeline" → /dashboard/crm/timeline
↓
Enter customer ID
↓
Shows: Activity history (jobs, invoices, follow-ups, whatsapp)
Can: Filter by source, view details

// ==========================================
// INTEGRATION WITH EXISTING FEATURES
// ==========================================

Job Card Detail Page (app/dashboard/jobcards/[id]/page.tsx)

- Can add: <CustomerTimeline customerId={jobCard.customerId} />
- Can add: <WhatsAppQuickAction ... />
- Can add: <AddFollowUpModal ... />

Customer Profile Page (future: app/dashboard/customers/[id]/page.tsx)

- Can add: <CustomerTimeline /> tab
- Can add: <AddFollowUpModal /> button
- Can show: Recent follow-ups

Invoice Detail Page (app/dashboard/sales-detail/[id]/page.tsx)

- Can add: <WhatsAppQuickAction messageTemplate="Payment reminder..." />
- Can add: <CustomerTimeline />

// ==========================================
// API ENDPOINTS USED
// ==========================================

GET /mobileshop/crm/dashboard
→ CrmDashboardWidgets uses this
→ Shows KPIs (customers, follow-ups, financials, loyalty, whatsapp)

GET /mobileshop/crm/follow-ups
→ MyFollowUpsWidget uses this
→ Gets follow-ups assigned to current user

POST /mobileshop/crm/follow-ups
→ AddFollowUpModal uses this
→ Creates new follow-up

PATCH /mobileshop/crm/follow-ups/{id}/status
→ "Mark Done" button uses this
→ Changes status to DONE/CANCELLED

GET /mobileshop/crm/customer-timeline/{customerId}
→ CustomerTimeline uses this
→ Gets activity history for a customer

POST /mobileshop/crm/whatsapp/send
→ WhatsAppQuickAction uses this
→ Sends WhatsApp message

// ==========================================
// STYLING & DARK MODE
// ==========================================

✅ All pages support dark mode (via ThemeContext)
✅ Sidebar menu items highlight on active routes
✅ Submenu items show in teal when active
✅ Cards have loading/error/empty states
✅ Responsive layout (works on mobile)
✅ Icons and color-coding for quick scanning
✅ Smooth animations and transitions

// ==========================================
// KEY FILES
// ==========================================

Navigation Configuration:
src/components/layout/sidebar.tsx
└─ Updated Customers menu with CRM submenu

Pages:
app/dashboard/crm/page.tsx
app/dashboard/crm/follow-ups/page.tsx
app/dashboard/crm/timeline/page.tsx

Components:
src/components/crm/CrmDashboardWidgets.tsx
src/components/crm/MyFollowUpsWidget.tsx
src/components/crm/CustomerTimeline.tsx
src/components/crm/AddFollowUpModal.tsx
src/components/crm/WhatsAppQuickAction.tsx

API:
src/services/crm.api.ts

Documentation:
CRM_UI_INTEGRATION_COMPLETE.md
SIDEBAR_CRM_INTEGRATION.md (this file)

// ==========================================
// VERIFICATION CHECKLIST
// ==========================================

✅ Sidebar menu has "Customers" with expandable submenu
✅ CRM routes accessible from sidebar
✅ CRM Dashboard page loads and shows widgets
✅ Follow-ups page shows widget and can add tasks
✅ Timeline page allows customer search
✅ Dark mode support
✅ Active route highlighting
✅ API service configured
✅ All components import correctly
✅ TypeScript types defined
✅ Error handling in place

// ==========================================
// QUICK START FOR DEVELOPERS
// ==========================================

1. Click "Customers" in sidebar → Submenu expands
2. Click "CRM Dashboard" → View KPIs
3. Click "My Follow-ups" → View and manage tasks
4. Click "Customer Timeline" → Search customer activity

To integrate CRM into other pages:
import { CrmDashboardWidgets, CustomerTimeline, AddFollowUpModal, WhatsAppQuickAction } from "@/components/crm";

// Use in your page:
<CustomerTimeline customerId={id} />
<WhatsAppQuickAction ... />
<AddFollowUpModal ... />
