# Payment Calculations - Outstanding, Pending, and Overdue

## Field Discovery Process

The system dynamically discovers payment-related fields on the Contact object in Salesforce. It searches for:

### Outstanding Balance Field
- **Primary**: `Outstanding_Balance__c`
- **Fallbacks** (in order):
  1. Fields containing "Outstanding" OR "Balance" ending with `__c`
  2. Fields containing "outstanding" OR "balance" (case-insensitive)
  3. Fields containing "Due" OR "Owed" ending with `__c`
  4. Fields containing "due" OR "owed" (case-insensitive)

### Payment Status Field
- **Primary**: `Payment_Status__c`
- **Fallbacks**:
  1. Fields containing "Payment" AND "Status" ending with `__c`
  2. Fields containing "payment" AND "status" (case-insensitive)

### Total Payment Amount Field
- **Primary**: `Total_Payment_Amount__c`
- **Fallbacks**:
  1. Fields containing "Payment" AND ("Amount" OR "Total") ending with `__c`
  2. Fields containing "payment" AND "amount" (case-insensitive)

---

## 1. Total Outstanding Calculation

**Endpoint**: `GET /api/contributor-payments/total-outstanding`

**Calculation**:
```sql
SELECT SUM(Outstanding_Balance__c) totalOutstanding 
FROM Contact 
WHERE Outstanding_Balance__c != null
```

**Fallback** (if WHERE clause fails):
```sql
SELECT SUM(Outstanding_Balance__c) totalOutstanding 
FROM Contact
```

**Logic**:
- Sums the `Outstanding_Balance__c` field (or discovered equivalent) across ALL Contact records
- First tries with `WHERE Outstanding_Balance__c != null` to exclude nulls
- If that fails, tries without the WHERE clause (SUM handles nulls as 0)
- Returns the total sum as a raw number

**Result**: Total amount outstanding across all contributors

---

## 2. Pending Amount Calculation

**Endpoint**: `GET /api/contributor-payments/pending-count`

**Step 1: Discover Payment Status Values**
```sql
SELECT Payment_Status__c 
FROM Contact 
WHERE Payment_Status__c != null 
LIMIT 1000
```
- Fetches all unique payment status values from Salesforce
- Performs case-insensitive matching to find status containing "pending"

**Step 2: Calculate Pending Amount**

**Strategy 1: Using Outstanding Balance (Primary)**
```sql
SELECT SUM(Outstanding_Balance__c) pendingAmount 
FROM Contact 
WHERE Payment_Status__c = 'Pending' 
  AND Outstanding_Balance__c != null
```

**Strategy 1b: Without Null Check (if Strategy 1 fails)**
```sql
SELECT SUM(Outstanding_Balance__c) pendingAmount 
FROM Contact 
WHERE Payment_Status__c = 'Pending'
```

**Strategy 2: Using Total Payment Amount (Fallback)**
```sql
SELECT SUM(Total_Payment_Amount__c) pendingAmount 
FROM Contact 
WHERE Payment_Status__c = 'Pending' 
  AND Total_Payment_Amount__c != null
```

**Logic**:
1. Discovers all payment status values from Salesforce
2. Finds status matching "pending" (case-insensitive, e.g., "Pending", "Pending Payment")
3. Tries to sum `Outstanding_Balance__c` for contacts with pending status
4. If that fails, tries without null check
5. If both fail, falls back to `Total_Payment_Amount__c`
6. Returns the sum as a raw number

**Result**: Total amount pending (sum of outstanding balances for contacts with "Pending" status)

---

## 3. Overdue Amount Calculation

**Endpoint**: `GET /api/contributor-payments/overdue-count`

**Step 1: Discover Payment Status Values**
```sql
SELECT Payment_Status__c 
FROM Contact 
WHERE Payment_Status__c != null 
LIMIT 1000
```
- Fetches all unique payment status values from Salesforce
- Performs case-insensitive matching to find status containing "overdue", "over due", or "past due"

**Step 2: Calculate Overdue Amount**

**Strategy 1: Using Outstanding Balance (Primary)**
```sql
SELECT SUM(Outstanding_Balance__c) overdueAmount 
FROM Contact 
WHERE Payment_Status__c = 'Overdue' 
  AND Outstanding_Balance__c != null
```

**Strategy 1b: Without Null Check (if Strategy 1 fails)**
```sql
SELECT SUM(Outstanding_Balance__c) overdueAmount 
FROM Contact 
WHERE Payment_Status__c = 'Overdue'
```

**Strategy 2: Using Total Payment Amount (Fallback)**
```sql
SELECT SUM(Total_Payment_Amount__c) overdueAmount 
FROM Contact 
WHERE Payment_Status__c = 'Overdue' 
  AND Total_Payment_Amount__c != null
```

**Logic**:
1. Discovers all payment status values from Salesforce
2. Finds status matching "overdue" variations (case-insensitive):
   - "overdue"
   - "over due"
   - "past due"
   - Any value containing "overdue"
3. Tries to sum `Outstanding_Balance__c` for contacts with overdue status
4. If that fails, tries without null check
5. If both fail, falls back to `Total_Payment_Amount__c`
6. Returns the sum as a raw number

**Result**: Total amount overdue (sum of outstanding balances for contacts with "Overdue" status)

---

## Summary

| Metric | Field Used | Filter | Calculation |
|--------|-----------|--------|-------------|
| **Total Outstanding** | `Outstanding_Balance__c` | None (all contacts) | `SUM(Outstanding_Balance__c)` |
| **Pending Amount** | `Outstanding_Balance__c` (primary) or `Total_Payment_Amount__c` (fallback) | `Payment_Status__c = 'Pending'` | `SUM(Outstanding_Balance__c)` WHERE status = Pending |
| **Overdue Amount** | `Outstanding_Balance__c` (primary) or `Total_Payment_Amount__c` (fallback) | `Payment_Status__c = 'Overdue'` | `SUM(Outstanding_Balance__c)` WHERE status = Overdue |

## Key Points

1. **Field Discovery**: All fields are dynamically discovered, so the system adapts to different Salesforce field names
2. **Status Matching**: Payment status values are discovered dynamically and matched case-insensitively
3. **Fallback Strategy**: If `Outstanding_Balance__c` is not available or query fails, falls back to `Total_Payment_Amount__c`
4. **Null Handling**: Tries with null checks first, then without if needed
5. **Raw Numbers**: All calculations return raw numbers (not formatted currency), formatting happens in the frontend

## Debugging

Check server console logs for:
- `=== DISCOVERED PAYMENT FIELDS ON CONTACT ===` - Shows which fields were found
- `Found payment status values:` - Shows all available status values
- `Status value used:` - Shows the exact status value being used in queries
- `Query (outstandingBalance):` or `Query (totalPaymentAmount):` - Shows the exact SOQL query being executed














