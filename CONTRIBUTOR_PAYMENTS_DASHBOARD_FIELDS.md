# Contributor Payments Dashboard - Object and Fields Reference

## Primary Object
**Contact** - Standard Salesforce object

## Fields Being Used

The dashboard dynamically discovers payment-related fields on the Contact object. It looks for the following fields (in order of preference):

### 1. Total Payment Amount
- **Primary Field Name**: `Total_Payment_Amount__c`
- **Fallback Search**: Any field containing "Payment" AND ("Amount" OR "Total") ending with `__c`
- **Used By Widgets**:
  - Total Payments
  - Average Payment
  - Payments by Status
  - Payments by Method
  - Payments Over Time
  - Top Contributors
  - Payments by Country

### 2. Outstanding Balance
- **Primary Field Name**: `Outstanding_Balance__c`
- **Fallback Search**: Any field containing ("Outstanding" OR "Balance") ending with `__c`
- **Used By Widgets**:
  - Total Outstanding
  - Payments by Status
  - Top Contributors
  - Payments by Country

### 3. Payment Status
- **Primary Field Name**: `Payment_Status__c`
- **Fallback Search**: Any field containing "Payment" AND "Status" ending with `__c`
- **Used By Widgets**:
  - Total Contributors (filter)
  - Paid Count
  - Pending Count
  - Overdue Count
  - Payments by Status
  - Top Contributors

### 4. Payment Method
- **Primary Field Name**: `Payment_Method__c`
- **Fallback Search**: Any field containing "Payment" AND "Method" ending with `__c`
- **Used By Widgets**:
  - Payments by Method
  - Top Contributors

### 5. Last Payment Date
- **Primary Field Name**: `Last_Payment_Date__c`
- **Fallback Search**: Any field containing "Payment" AND "Date" ending with `__c`
- **Used By Widgets**:
  - Payments Over Time
  - Top Contributors

### 6. Payment Frequency
- **Primary Field Name**: `Payment_Frequency__c`
- **Fallback Search**: Any field containing "Payment" AND "Frequency" ending with `__c`
- **Used By Widgets**: Currently not used in any widget (reserved for future use)

## Standard Contact Fields Used

### MailingCountry
- **Field Name**: `MailingCountry` (standard field)
- **Used By Widgets**:
  - Payments by Country

### Standard Fields (Always Available)
- **Id**: Contact record ID
- **Name**: Contact name
- **Email**: Contact email address

## Widget-to-Field Mapping

| Widget | Object | Fields Used |
|--------|--------|-------------|
| Total Contributors | Contact | `Total_Payment_Amount__c`, `Outstanding_Balance__c`, `Payment_Status__c` (any one) |
| Total Payments | Contact | `Total_Payment_Amount__c` |
| Total Outstanding | Contact | `Outstanding_Balance__c` |
| Average Payment | Contact | `Total_Payment_Amount__c` |
| Paid Count | Contact | `Payment_Status__c` (filtered by value = 'Paid') |
| Pending Count | Contact | `Payment_Status__c` (filtered by value = 'Pending') |
| Overdue Count | Contact | `Payment_Status__c` (filtered by value = 'Overdue') |
| Payments by Status | Contact | `Payment_Status__c`, `Total_Payment_Amount__c`, `Outstanding_Balance__c` |
| Payments by Method | Contact | `Payment_Method__c`, `Total_Payment_Amount__c` |
| Payments Over Time | Contact | `Last_Payment_Date__c`, `Total_Payment_Amount__c` |
| Top Contributors | Contact | `Id`, `Name`, `Email`, `Total_Payment_Amount__c`, `Outstanding_Balance__c`, `Payment_Status__c`, `Last_Payment_Date__c`, `Payment_Method__c` |
| Payments by Country | Contact | `MailingCountry`, `Total_Payment_Amount__c`, `Outstanding_Balance__c` |

## Field Discovery Process

The dashboard uses a dynamic field discovery process:

1. **Describe Contact Object**: Queries Salesforce to get all available fields on Contact
2. **Search for Payment Fields**: Looks for fields matching the patterns above
3. **Priority Matching**: 
   - First tries exact match (e.g., `Total_Payment_Amount__c`)
   - Then tries custom field pattern (contains keywords + ends with `__c`)
   - Finally tries case-insensitive fuzzy match
4. **Fallback**: If no fields are found, uses default field names (may cause query errors if fields don't exist)

## Testing Field Discovery

You can test which fields are discovered by calling:
```
GET /api/contributor-payments/test-fields
```

This endpoint will return:
- All discovered payment fields
- A sample Contact record
- Which fields were found vs. which are null

## Notes

- All payment fields are expected to be **custom fields** (ending with `__c`)
- If payment fields don't exist on Contact, widgets will return 0 or empty data
- The dashboard gracefully handles missing fields by returning empty results
- Field discovery happens on every API call (not cached) to ensure accuracy














