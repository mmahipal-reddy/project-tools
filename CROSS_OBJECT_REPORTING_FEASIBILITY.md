# Cross-Object Reporting Feasibility Analysis

## Current State

The Report Builder currently supports:
- Single object reporting (Project, Project Objective, Contributor Project, Contributor, Cases)
- Relationship field traversal (e.g., Account__r.Name, Contact.Name)
- Automatic inclusion of relationship fields when lookup fields are selected

## Salesforce SOQL Limitations

1. **No SQL-style JOINs**: SOQL doesn't support JOIN operations like SQL
2. **Single Primary Object**: Each query can only have one primary object (FROM clause)
3. **Relationship Traversal**: Can traverse relationships up to 5 levels deep using dot notation
4. **Subqueries**: Can query child records using subqueries (e.g., SELECT Id, (SELECT Name FROM Contacts) FROM Account)
5. **No UNION**: Cannot combine results from multiple unrelated queries

## Cross-Object Reporting Approaches

### Approach 1: Relationship Traversal (Recommended)
**How it works:**
- Select a primary object (e.g., Project)
- Traverse relationships to access related object fields
- Example: Project → Account → Contact (Project.Account__r.Contact__r.Name)

**Pros:**
- Native SOQL support
- Single query execution
- Maintains referential integrity
- Fast performance

**Cons:**
- Limited to related objects (must have relationship path)
- Cannot join unrelated objects
- Relationship depth limit (5 levels)

**Use Cases:**
- Project with Account details
- Case with Contact and Account information
- Contributor Project with Project and Contributor details

### Approach 2: Subqueries for Child Records
**How it works:**
- Query parent object with child record subqueries
- Example: SELECT Id, Name, (SELECT Name, Status FROM Cases) FROM Account

**Pros:**
- Native SOQL support
- Single query execution
- Can aggregate child records

**Cons:**
- Only works for parent-child relationships
- Limited to one level of child records per query
- Cannot filter child records easily

**Use Cases:**
- Account with all related Cases
- Project with all related Project Objectives
- Contact with all related Cases

### Approach 3: Multiple Queries with Client-Side Merging
**How it works:**
- Execute separate queries for each object
- Merge results client-side based on common keys (IDs, lookup fields)

**Pros:**
- Can combine unrelated objects
- Flexible field selection
- No relationship requirements

**Cons:**
- Multiple API calls
- Client-side processing overhead
- Potential data inconsistency
- Complex merging logic
- Performance concerns with large datasets

**Use Cases:**
- Combining Project and Case data (if no direct relationship)
- Cross-object analytics

## Recommended Implementation Strategy

### Phase 1: Enhanced Relationship Field Selection (Immediate)
1. **Discover Available Relationships**
   - Query object metadata to find all lookup/master-detail fields
   - Show relationship paths in UI
   - Allow users to browse and select fields from related objects

2. **Relationship Browser UI**
   - Tree view showing: Primary Object → Related Objects → Fields
   - Visual indication of relationship type (lookup/master-detail)
   - Show relationship depth

3. **Field Selection Enhancement**
   - Group fields by object
   - Show relationship path for each field
   - Support multi-level relationships (up to 5 levels)

### Phase 2: Subquery Support (Short-term)
1. **Child Record Queries**
   - Detect parent-child relationships
   - Allow selecting child object fields
   - Support filtering child records

2. **Subquery UI**
   - Show available child objects
   - Allow selecting child object fields
   - Support child record filters

### Phase 3: Multi-Query Merging (Long-term, if needed)
1. **Multiple Object Selection**
   - Allow selecting multiple unrelated objects
   - Define merge keys (common fields)
   - Client-side result merging

2. **Merge Configuration UI**
   - Select merge strategy (inner join, left join, etc.)
   - Define merge keys
   - Handle data type mismatches

## Implementation Plan

### Backend Changes

1. **Relationship Discovery Endpoint**
   - `/api/update-object-fields/relationships/:objectType`
   - Returns all available relationships with metadata
   - Includes relationship type, target object, field name

2. **Enhanced Field Loading**
   - Include relationship metadata in field responses
   - Add relationship path information
   - Support relationship field selection

3. **Query Builder Enhancement**
   - Support multi-level relationship traversal
   - Handle subqueries for child records
   - Optimize query construction

### Frontend Changes

1. **Relationship Browser Component**
   - Tree view of objects and relationships
   - Field selection from related objects
   - Visual relationship indicators

2. **Enhanced Field Selector**
   - Group fields by object
   - Show relationship paths
   - Support relationship field selection

3. **Query Preview Enhancement**
   - Show relationship fields in preview
   - Handle nested relationship data
   - Display relationship paths in column headers

## Technical Considerations

### Relationship Types

1. **Lookup Relationships**
   - One-to-many (parent to child)
   - Nullable (can be empty)
   - Example: Project__c → Account__c (Project has Account)

2. **Master-Detail Relationships**
   - One-to-many (parent to child)
   - Required (cannot be null)
   - Cascade delete
   - Example: Project_Objective__c → Project__c (Objective belongs to Project)

3. **Standard Relationships**
   - Contact, Owner, CreatedBy, LastModifiedBy, Account, Parent
   - Pre-defined by Salesforce
   - Example: Case → Contact, Case → Account

### Query Examples

**Multi-level Relationship:**
```soql
SELECT Id, Name, Account__r.Name, Account__r.Contact__r.Email 
FROM Project__c
```

**Subquery for Child Records:**
```soql
SELECT Id, Name, 
  (SELECT Name, Status__c FROM Project_Objectives__r)
FROM Project__c
```

**Combined:**
```soql
SELECT Id, Name, Account__r.Name,
  (SELECT Name, Status__c FROM Project_Objectives__r)
FROM Project__c
```

## User Experience Flow

1. **Select Primary Object**: User selects main object (e.g., Project)
2. **Browse Relationships**: System shows available relationships
3. **Select Related Fields**: User expands relationship tree and selects fields
4. **Configure Filters**: User can filter on any selected field (primary or related)
5. **Preview & Generate**: System builds optimized SOQL query and executes

## Benefits

1. **More Powerful Reports**: Access data from multiple related objects
2. **Better Insights**: Combine related data in single report
3. **Reduced Manual Work**: No need to export and merge multiple reports
4. **Real-time Data**: Single query ensures data consistency
5. **Native Performance**: Leverages Salesforce query optimization

## Limitations

1. **Relationship Dependency**: Objects must be related
2. **Depth Limit**: Maximum 5 levels of relationship traversal
3. **No Unrelated Joins**: Cannot combine completely unrelated objects
4. **Subquery Limits**: Limited child record querying capabilities

## Conclusion

**Recommended Approach**: Start with Phase 1 (Enhanced Relationship Field Selection) as it provides immediate value with minimal complexity. This allows users to build reports with fields from related objects using native SOQL capabilities.

Phase 2 (Subquery Support) can be added for parent-child scenarios, and Phase 3 (Multi-Query Merging) can be considered only if there's a strong need for combining unrelated objects.



