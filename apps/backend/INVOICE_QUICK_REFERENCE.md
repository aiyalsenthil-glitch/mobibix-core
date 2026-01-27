# Invoice Numbering - Quick Reference

## Invoice Number Format

```
{SHOP_PREFIX}-{TYPE}-{FINANCIAL_YEAR}-{SEQUENCE}
HP-S-202526-0001
│   │ │      │
│   │ │      └─ Sequence: 0001-9999 (resets every FY)
│   │ └──────── FY: 202526 (Apr2025-Mar2026), 202627 (Apr2026-Mar2027), etc.
│   └────────── Type: S=Sales, P=Purchase, J=JobCard
└──────────────  Shop Prefix: HP, AT, etc.
```

## Financial Year Examples

| Date Range | FY Code |
|-----------|---------|
| Apr 1, 2025 - Mar 31, 2026 | 202526 |
| Apr 1, 2026 - Mar 31, 2027 | 202627 |
| Apr 1, 2027 - Mar 31, 2028 | 202728 |

**How to Calculate:** 
- If month is January, February, or March → FY is (year-1) to (year)
- If month is April or later → FY is (year) to (year+1)

## Real Examples

### Sales Invoices (Type S)
```
HP-S-202526-0001  ← First sales invoice for HP shop in FY 202526
HP-S-202526-0002  ← Second sales invoice
AT-S-202526-0001  ← First sales invoice for AT shop (separate sequence!)
HP-S-202627-0001  ← First invoice on April 1, 2026 (sequence reset!)
```

### Purchase Invoices (Type P)
```
HP-P-202526-0001  ← First purchase for HP (separate from sales!)
HP-P-202526-0002  ← Second purchase
AT-P-202526-0001  ← Different shop, different sequence
```

### Job Cards (Type J)
```
HP-J-202526-0001  ← First job card for HP
HP-J-202526-0002  ← Second job card
```

## When Does Sequence Reset?

**April 1, at midnight** - Every new financial year

| Date | FY | Last Invoice Created | First Invoice After Reset |
|------|----|--------------------|-------------------------|
| Mar 31, 2026 | 202526 | HP-S-202526-9999 | (can't create more) |
| Apr 1, 2026 | 202627 | - | HP-S-202627-0001 ← **RESET!** |
| Apr 2, 2026 | 202627 | - | HP-S-202627-0002 |

## Key Points

✅ **Automatic:** You don't need to do anything. System resets on April 1 automatically.

✅ **Per Shop:** Each shop has its own sequence. HP starts at 0001, AT starts at 0001 (separate).

✅ **Per Type:** Sales, Purchases, and Job Cards have separate sequences. They don't interfere.

✅ **Safe:** Even if two people create invoices at the same time, the system ensures no duplicates.

✅ **Unique:** Every invoice has a unique number within its shop+type+year combination.

## Database Schema

**Invoices Table:**
- `invoiceNumber` - The full number (e.g., "HP-S-202526-0001")
- `shopId` - Which shop created it
- `createdAt` - When it was created

**Example Query** (shows how system finds next sequence):
```sql
SELECT invoiceNumber FROM invoices 
WHERE shopId = 'hp-shop-id' 
  AND invoiceNumber LIKE '%-S-202526-%'
ORDER BY createdAt DESC;

-- Returns: HP-S-202526-0001, HP-S-202526-0002, HP-S-202526-0003
-- Next sequence: 0004
```

## Troubleshooting

**Q: Invoice shows "AT-P-260127-0011" instead of "HP-S-202526-0001"**
- A: Old code was hardcoded in frontend. This has been fixed. Clear cache and reload.

**Q: Two users created invoices at same time, got same number?**
- A: System has race condition protection. If this happens, report to team with exact time.

**Q: Sequence didn't reset on April 1?**
- A: Check that backend is running the latest code. Sequence resets automatically through FY calculation.

**Q: Can we use more than 9999 invoices per year?**
- A: Currently limited to 9999 (four-digit sequence). Contact team to increase format if needed.

---

**System Status:** ✅ Live and Running  
**Backend Port:** 3000  
**Current Date:** January 27, 2026 (FY: 202526)
