# Field Mapping Enhancements - Detailed Implementation Plan

## Overview
This document outlines the detailed implementation plan for enhancing the Field Mapping transformation options in the Update Object Fields page.

## Priority 1: Text Replacement (Find and Replace)

### Requirements
- Find and replace text in source field values
- Support multiple replacement modes: replace all, replace first, case-sensitive/insensitive
- Support regex patterns (optional, advanced mode)

### Implementation Details

#### Frontend Changes (`client/src/pages/UpdateObjectFields.js`)

1. **Add transformation option to dropdown:**
```javascript
// In fieldMappings state, add:
transformation: 'textReplace', // New option
findText: '', // Text to find
replaceText: '', // Text to replace with
replaceMode: 'all', // 'all', 'first', 'last'
caseSensitive: false, // true/false
useRegex: false // true/false (advanced)
```

2. **Add UI components:**
```javascript
// Add to transformation dropdown:
<option value="textReplace">Text Replace - Find and replace text</option>

// Add form fields when textReplace is selected:
{mapping.transformation === 'textReplace' && (
  <>
    <div className="form-group">
      <label>Find Text *</label>
      <input
        type="text"
        value={mapping.findText || ''}
        onChange={(e) => {
          const updated = fieldMappings.map(m => 
            m.id === mapping.id ? { ...m, findText: e.target.value } : m
          );
          setFieldMappings(updated);
        }}
        placeholder="Text to find"
        style={{ fontSize: '12px', padding: '6px 10px', height: '32px', width: '100%' }}
      />
    </div>
    <div className="form-group">
      <label>Replace With *</label>
      <input
        type="text"
        value={mapping.replaceText || ''}
        onChange={(e) => {
          const updated = fieldMappings.map(m => 
            m.id === mapping.id ? { ...m, replaceText: e.target.value } : m
          );
          setFieldMappings(updated);
        }}
        placeholder="Text to replace with"
        style={{ fontSize: '12px', padding: '6px 10px', height: '32px', width: '100%' }}
      />
    </div>
    <div className="form-group">
      <label>Replace Mode</label>
      <select
        value={mapping.replaceMode || 'all'}
        onChange={(e) => {
          const updated = fieldMappings.map(m => 
            m.id === mapping.id ? { ...m, replaceMode: e.target.value } : m
          );
          setFieldMappings(updated);
        }}
        style={{ fontSize: '12px', padding: '6px 10px', height: '32px', width: '100%' }}
      >
        <option value="all">Replace All Occurrences</option>
        <option value="first">Replace First Occurrence</option>
        <option value="last">Replace Last Occurrence</option>
      </select>
    </div>
    <div className="form-group">
      <label>
        <input
          type="checkbox"
          checked={mapping.caseSensitive || false}
          onChange={(e) => {
            const updated = fieldMappings.map(m => 
              m.id === mapping.id ? { ...m, caseSensitive: e.target.checked } : m
            );
            setFieldMappings(updated);
          }}
        />
        Case Sensitive
      </label>
    </div>
    <div className="form-group">
      <label>
        <input
          type="checkbox"
          checked={mapping.useRegex || false}
          onChange={(e) => {
            const updated = fieldMappings.map(m => 
              m.id === mapping.id ? { ...m, useRegex: e.target.checked } : m
            );
            setFieldMappings(updated);
          }}
        />
        Use Regular Expression (Advanced)
      </label>
      {mapping.useRegex && (
        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
          Warning: Regex patterns can be complex. Test carefully in preview mode.
        </div>
      )}
    </div>
  </>
)}
```

3. **Update validation:**
```javascript
// In validateMapping function:
if (m.transformation === 'textReplace') {
  return m.findText && m.findText.trim() !== '' && m.replaceText !== undefined;
}
```

#### Backend Changes (`server/routes/updateObjectFields.js`)

1. **Add transformation handler:**
```javascript
// In applyTransformation function or in mapping execution:
case 'textReplace':
  if (!options.findText) return value;
  
  const findText = options.findText;
  const replaceText = options.replaceText || '';
  const replaceMode = options.replaceMode || 'all';
  const caseSensitive = options.caseSensitive || false;
  const useRegex = options.useRegex || false;
  
  let text = String(value);
  
  if (useRegex) {
    // Security: Validate regex pattern to prevent ReDoS attacks
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(findText, flags);
      
      // Limit regex complexity (prevent catastrophic backtracking)
      if (findText.length > 100) {
        throw new Error('Regex pattern too long (max 100 characters)');
      }
      
      if (replaceMode === 'all') {
        return text.replace(regex, replaceText);
      } else if (replaceMode === 'first') {
        return text.replace(regex, replaceText);
      } else if (replaceMode === 'last') {
        // For last occurrence, reverse string, replace first, reverse back
        const reversed = text.split('').reverse().join('');
        const reversedRegex = new RegExp(findText.split('').reverse().join(''), flags);
        const replaced = reversed.replace(reversedRegex, replaceText.split('').reverse().join(''));
        return replaced.split('').reverse().join('');
      }
    } catch (error) {
      console.error('Regex error:', error);
      return value; // Return original on error
    }
  } else {
    // Simple string replacement
    if (caseSensitive) {
      if (replaceMode === 'all') {
        return text.split(findText).join(replaceText);
      } else if (replaceMode === 'first') {
        return text.replace(findText, replaceText);
      } else if (replaceMode === 'last') {
        const lastIndex = text.lastIndexOf(findText);
        if (lastIndex === -1) return text;
        return text.substring(0, lastIndex) + replaceText + text.substring(lastIndex + findText.length);
      }
    } else {
      // Case insensitive - convert to lowercase for comparison
      const lowerText = text.toLowerCase();
      const lowerFind = findText.toLowerCase();
      let result = text;
      let searchIndex = 0;
      
      if (replaceMode === 'all') {
        while ((searchIndex = lowerText.indexOf(lowerFind, searchIndex)) !== -1) {
          result = result.substring(0, searchIndex) + replaceText + result.substring(searchIndex + findText.length);
          searchIndex += replaceText.length;
        }
        return result;
      } else if (replaceMode === 'first') {
        const index = lowerText.indexOf(lowerFind);
        if (index === -1) return text;
        return text.substring(0, index) + replaceText + text.substring(index + findText.length);
      } else if (replaceMode === 'last') {
        const index = lowerText.lastIndexOf(lowerFind);
        if (index === -1) return text;
        return text.substring(0, index) + replaceText + text.substring(index + findText.length);
      }
    }
  }
  return value;
```

2. **Update mapping execution:**
```javascript
// In preview-mapping and update-mapping endpoints:
else if (mapping.transformation === 'textReplace') {
  const sourceValue = sourceRecord[mapping.sourceField];
  if (sourceValue === null || sourceValue === undefined || sourceValue === '') {
    transformedValue = null;
  } else {
    transformedValue = applyTextReplace(String(sourceValue), {
      findText: mapping.findText,
      replaceText: mapping.replaceText,
      replaceMode: mapping.replaceMode || 'all',
      caseSensitive: mapping.caseSensitive || false,
      useRegex: mapping.useRegex || false
    });
  }
}
```

### Security Considerations
- **Regex Validation**: Limit regex pattern length to 100 characters
- **ReDoS Prevention**: Use timeout for regex operations (optional, can use worker threads)
- **Input Sanitization**: Escape special regex characters when not using regex mode
- **Error Handling**: Return original value on error, don't crash

### Testing Checklist
- [ ] Replace all occurrences (case sensitive)
- [ ] Replace all occurrences (case insensitive)
- [ ] Replace first occurrence
- [ ] Replace last occurrence
- [ ] Regex replacement (simple pattern)
- [ ] Regex replacement (complex pattern)
- [ ] Null/empty source values
- [ ] Special characters in find/replace text
- [ ] Very long strings (performance test)
- [ ] Invalid regex patterns (error handling)

---

## Priority 2: Conditional Logic Enhancements

### 2.1 Multiple Conditions (AND/OR)

#### Requirements
- Support multiple conditions with AND/OR operators
- Group conditions with parentheses
- Support NOT operator

#### Implementation Details

**Frontend Changes:**

1. **Update state structure:**
```javascript
// Modify conditional transformation structure:
transformation: 'conditional',
conditions: [{
  id: Date.now(),
  field: '',
  operator: 'equals',
  value: '',
  logicalOperator: 'AND' // 'AND', 'OR', 'NOT' (for next condition)
}],
thenValue: '',
elseValue: ''
```

2. **UI Components:**
```javascript
{mapping.transformation === 'conditional' && (
  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
    <label>Conditions *</label>
    <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
      Define one or more conditions. Use AND/OR to combine conditions.
    </div>
    
    {mapping.conditions.map((condition, condIndex) => (
      <div key={condition.id} style={{ 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '12px', 
        marginBottom: '12px',
        backgroundColor: '#f9fafb'
      }}>
        {condIndex > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <select
              value={condition.logicalOperator || 'AND'}
              onChange={(e) => {
                const updated = fieldMappings.map(m => {
                  if (m.id === mapping.id) {
                    const newConditions = [...m.conditions];
                    newConditions[condIndex].logicalOperator = e.target.value;
                    return { ...m, conditions: newConditions };
                  }
                  return m;
                });
                setFieldMappings(updated);
              }}
              style={{ fontSize: '12px', padding: '4px 8px' }}
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
              <option value="NOT">NOT</option>
            </select>
          </div>
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '8px' }}>
          <select
            value={condition.field}
            onChange={(e) => {
              const updated = fieldMappings.map(m => {
                if (m.id === mapping.id) {
                  const newConditions = [...m.conditions];
                  newConditions[condIndex].field = e.target.value;
                  return { ...m, conditions: newConditions };
                }
                return m;
              });
              setFieldMappings(updated);
            }}
            style={{ fontSize: '12px', padding: '6px 10px', height: '32px' }}
          >
            <option value="">--Select Field--</option>
            {sourceFields.map(f => (
              <option key={f.name} value={f.name}>{f.label}</option>
            ))}
          </select>
          
          <select
            value={condition.operator}
            onChange={(e) => {
              const updated = fieldMappings.map(m => {
                if (m.id === mapping.id) {
                  const newConditions = [...m.conditions];
                  newConditions[condIndex].operator = e.target.value;
                  return { ...m, conditions: newConditions };
                }
                return m;
              });
              setFieldMappings(updated);
            }}
            style={{ fontSize: '12px', padding: '6px 10px', height: '32px' }}
          >
            <option value="equals">Equals</option>
            <option value="notEquals">Not Equals</option>
            <option value="contains">Contains</option>
            <option value="notContains">Not Contains</option>
            <option value="greaterThan">Greater Than</option>
            <option value="lessThan">Less Than</option>
            <option value="greaterThanOrEqual">Greater Than Or Equal</option>
            <option value="lessThanOrEqual">Less Than Or Equal</option>
            <option value="startsWith">Starts With</option>
            <option value="endsWith">Ends With</option>
            <option value="isEmpty">Is Empty</option>
            <option value="isNotEmpty">Is Not Empty</option>
            <option value="isNull">Is Null</option>
            <option value="isNotNull">Is Not Null</option>
          </select>
          
          {!['isEmpty', 'isNotEmpty', 'isNull', 'isNotNull'].includes(condition.operator) && (
            <input
              type="text"
              value={condition.value}
              onChange={(e) => {
                const updated = fieldMappings.map(m => {
                  if (m.id === mapping.id) {
                    const newConditions = [...m.conditions];
                    newConditions[condIndex].value = e.target.value;
                    return { ...m, conditions: newConditions };
                  }
                  return m;
                });
                setFieldMappings(updated);
              }}
              placeholder="Value"
              style={{ fontSize: '12px', padding: '6px 10px', height: '32px' }}
            />
          )}
        </div>
        
        {mapping.conditions.length > 1 && (
          <button
            type="button"
            onClick={() => {
              const updated = fieldMappings.map(m => {
                if (m.id === mapping.id) {
                  const newConditions = m.conditions.filter((_, idx) => idx !== condIndex);
                  return { ...m, conditions: newConditions.length > 0 ? newConditions : [{ id: Date.now(), field: '', operator: 'equals', value: '', logicalOperator: 'AND' }] };
                }
                return m;
              });
              setFieldMappings(updated);
            }}
            style={{ marginTop: '8px', padding: '4px 8px', fontSize: '11px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer' }}
          >
            <X size={12} /> Remove Condition
          </button>
        )}
      </div>
    ))}
    
    <button
      type="button"
      onClick={() => {
        const updated = fieldMappings.map(m => {
          if (m.id === mapping.id) {
            return { 
              ...m, 
              conditions: [...m.conditions, { 
                id: Date.now(), 
                field: '', 
                operator: 'equals', 
                value: '', 
                logicalOperator: 'AND' 
              }]
            };
          }
          return m;
        });
        setFieldMappings(updated);
      }}
      style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
    >
      <Plus size={14} /> Add Condition
    </button>
    
    {/* Then/Else values remain the same */}
    <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      <div className="form-group">
        <label>Then Value *</label>
        {/* Then value input - same as current */}
      </div>
      <div className="form-group">
        <label>Else Value</label>
        {/* Else value input - same as current */}
      </div>
    </div>
  </div>
)}
```

**Backend Changes:**

```javascript
// Update conditional evaluation:
function evaluateConditions(conditions, sourceRecord) {
  if (!conditions || conditions.length === 0) return false;
  
  let result = evaluateSingleCondition(conditions[0], sourceRecord);
  
  for (let i = 1; i < conditions.length; i++) {
    const condition = conditions[i];
    const conditionResult = evaluateSingleCondition(condition, sourceRecord);
    const logicalOp = condition.logicalOperator || 'AND';
    
    if (logicalOp === 'AND') {
      result = result && conditionResult;
    } else if (logicalOp === 'OR') {
      result = result || conditionResult;
    } else if (logicalOp === 'NOT') {
      result = result && !conditionResult;
    }
  }
  
  return result;
}

function evaluateSingleCondition(condition, sourceRecord) {
  let fieldValue = sourceRecord[condition.field];
  
  // Case-insensitive field matching
  if (fieldValue === undefined) {
    const fieldKey = Object.keys(sourceRecord).find(key => 
      key.toLowerCase() === condition.field.toLowerCase()
    );
    if (fieldKey) fieldValue = sourceRecord[fieldKey];
  }
  
  const operator = condition.operator || 'equals';
  const conditionValue = condition.value;
  
  // Handle null/empty checks
  if (operator === 'isEmpty') {
    return fieldValue === null || fieldValue === undefined || String(fieldValue).trim() === '';
  }
  if (operator === 'isNotEmpty') {
    return fieldValue !== null && fieldValue !== undefined && String(fieldValue).trim() !== '';
  }
  if (operator === 'isNull') {
    return fieldValue === null || fieldValue === undefined;
  }
  if (operator === 'isNotNull') {
    return fieldValue !== null && fieldValue !== undefined;
  }
  
  if (fieldValue === null || fieldValue === undefined) {
    return false;
  }
  
  const fieldStr = String(fieldValue);
  const conditionStr = String(conditionValue);
  
  switch (operator) {
    case 'equals':
      return fieldStr === conditionStr || fieldStr.trim() === conditionStr.trim();
    case 'notEquals':
      return fieldStr !== conditionStr && fieldStr.trim() !== conditionStr.trim();
    case 'contains':
      return fieldStr.toLowerCase().includes(conditionStr.toLowerCase());
    case 'notContains':
      return !fieldStr.toLowerCase().includes(conditionStr.toLowerCase());
    case 'startsWith':
      return fieldStr.toLowerCase().startsWith(conditionStr.toLowerCase());
    case 'endsWith':
      return fieldStr.toLowerCase().endsWith(conditionStr.toLowerCase());
    case 'greaterThan':
      const num1 = parseFloat(fieldStr);
      const num2 = parseFloat(conditionStr);
      return !isNaN(num1) && !isNaN(num2) && num1 > num2;
    case 'lessThan':
      const num3 = parseFloat(fieldStr);
      const num4 = parseFloat(conditionStr);
      return !isNaN(num3) && !isNaN(num4) && num3 < num4;
    case 'greaterThanOrEqual':
      const num5 = parseFloat(fieldStr);
      const num6 = parseFloat(conditionStr);
      return !isNaN(num5) && !isNaN(num6) && num5 >= num6;
    case 'lessThanOrEqual':
      const num7 = parseFloat(fieldStr);
      const num8 = parseFloat(conditionStr);
      return !isNaN(num7) && !isNaN(num8) && num7 <= num8;
    default:
      return false;
  }
}

// In mapping execution:
else if (mapping.transformation === 'conditional') {
  const conditionsMet = evaluateConditions(mapping.conditions, sourceRecord);
  if (conditionsMet) {
    transformedValue = convertValueToType(mapping.thenValue, targetFieldType);
  } else {
    transformedValue = mapping.elseValue !== undefined && mapping.elseValue !== null && mapping.elseValue !== '' 
      ? convertValueToType(mapping.elseValue, targetFieldType) 
      : null;
  }
}
```

### 2.2 Nested Conditionals

#### Requirements
- Support IF-THEN-ELSE within ELSE clauses
- Visual tree structure for nested conditions

#### Implementation Details

**State Structure:**
```javascript
transformation: 'nestedConditional',
conditionTree: {
  condition: { field: '', operator: '', value: '' },
  then: {
    type: 'value', // 'value' or 'condition'
    value: '', // if type is 'value'
    condition: null // if type is 'condition', recursive structure
  },
  else: {
    type: 'value',
    value: '',
    condition: null
  }
}
```

**UI Implementation:**
- Use recursive component to render nested conditions
- Indentation to show nesting level
- Collapsible sections for deep nesting
- Limit nesting depth to 5 levels (performance)

### 2.3 Case/Switch Statements

#### Requirements
- Map multiple source values to different target values
- Default case for unmatched values

#### Implementation Details

**State Structure:**
```javascript
transformation: 'switch',
sourceField: '',
cases: [
  { value: '', targetValue: '' },
  { value: '', targetValue: '' }
],
defaultValue: ''
```

**Backend Implementation:**
```javascript
else if (mapping.transformation === 'switch') {
  const sourceValue = sourceRecord[mapping.sourceField];
  const sourceStr = String(sourceValue || '').trim();
  
  const matchedCase = mapping.cases.find(c => 
    String(c.value || '').trim() === sourceStr
  );
  
  if (matchedCase) {
    transformedValue = convertValueToType(matchedCase.targetValue, targetFieldType);
  } else {
    transformedValue = mapping.defaultValue !== undefined && mapping.defaultValue !== null && mapping.defaultValue !== ''
      ? convertValueToType(mapping.defaultValue, targetFieldType)
      : null;
  }
}
```

---

## Priority 3: Data Validation and Cleaning

### 3.1 Default Value if Empty

#### Implementation

**Frontend:**
```javascript
transformation: 'defaultValue',
sourceField: '',
defaultValue: '',
applyWhen: 'empty' // 'empty', 'null', 'emptyOrNull', 'invalid'
```

**Backend:**
```javascript
else if (mapping.transformation === 'defaultValue') {
  const sourceValue = sourceRecord[mapping.sourceField];
  const applyWhen = mapping.applyWhen || 'empty';
  
  let shouldApplyDefault = false;
  
  if (applyWhen === 'empty') {
    shouldApplyDefault = sourceValue === null || sourceValue === undefined || String(sourceValue).trim() === '';
  } else if (applyWhen === 'null') {
    shouldApplyDefault = sourceValue === null || sourceValue === undefined;
  } else if (applyWhen === 'emptyOrNull') {
    shouldApplyDefault = sourceValue === null || sourceValue === undefined || String(sourceValue).trim() === '';
  } else if (applyWhen === 'invalid') {
    // Check if value is invalid based on target field type
    shouldApplyDefault = !isValidForTargetType(sourceValue, targetFieldType);
  }
  
  transformedValue = shouldApplyDefault 
    ? convertValueToType(mapping.defaultValue, targetFieldType)
    : convertValueToType(sourceValue, targetFieldType);
}
```

### 3.2 Data Type Conversion

#### Implementation

**Frontend:**
```javascript
transformation: 'typeConversion',
sourceField: '',
targetType: 'string', // 'string', 'number', 'boolean', 'date'
format: '' // Optional format for date conversion
```

**Backend:**
```javascript
function convertValueToType(value, targetType, format = null) {
  if (value === null || value === undefined) return null;
  
  switch (targetType) {
    case 'string':
      return String(value);
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    case 'boolean':
      if (value === 'true' || value === true || value === '1' || value === 1) return true;
      if (value === 'false' || value === false || value === '0' || value === 0) return false;
      return Boolean(value);
    case 'date':
      if (value instanceof Date) return value;
      if (format) {
        return parseDateWithFormat(String(value), format);
      }
      return new Date(value);
    default:
      return value;
  }
}
```

### 3.3 Format Validation

#### Implementation

**Frontend:**
```javascript
transformation: 'validateFormat',
sourceField: '',
validationType: 'email', // 'email', 'phone', 'url', 'postalCode', 'custom'
customPattern: '', // For custom regex
onInvalid: 'default', // 'default', 'skip', 'error'
defaultValue: ''
```

**Backend:**
```javascript
const validators = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\+\(\)]+$/,
  url: /^https?:\/\/.+/,
  postalCode: /^[\dA-Z\s\-]+$/i
};

else if (mapping.transformation === 'validateFormat') {
  const sourceValue = sourceRecord[mapping.sourceField];
  const validationType = mapping.validationType;
  const onInvalid = mapping.onInvalid || 'default';
  
  let isValid = false;
  
  if (validationType === 'custom' && mapping.customPattern) {
    try {
      const regex = new RegExp(mapping.customPattern);
      isValid = regex.test(String(sourceValue || ''));
    } catch (error) {
      isValid = false;
    }
  } else if (validators[validationType]) {
    isValid = validators[validationType].test(String(sourceValue || ''));
  }
  
  if (isValid) {
    transformedValue = sourceValue;
  } else {
    if (onInvalid === 'default') {
      transformedValue = mapping.defaultValue !== undefined ? mapping.defaultValue : null;
    } else if (onInvalid === 'skip') {
      transformedValue = null; // Skip this record
    } else if (onInvalid === 'error') {
      throw new Error(`Validation failed for field ${mapping.sourceField}: ${sourceValue}`);
    }
  }
}
```

### 3.4 Remove Special Characters

#### Implementation

**Frontend:**
```javascript
transformation: 'removeSpecialChars',
sourceField: '',
mode: 'removeAll', // 'removeAll', 'keepOnlyNumbers', 'keepOnlyLetters', 'keepOnlyAlphanumeric'
```

**Backend:**
```javascript
else if (mapping.transformation === 'removeSpecialChars') {
  const sourceValue = sourceRecord[mapping.sourceField];
  if (sourceValue === null || sourceValue === undefined) {
    transformedValue = null;
  } else {
    const text = String(sourceValue);
    const mode = mapping.mode || 'removeAll';
    
    if (mode === 'removeAll') {
      transformedValue = text.replace(/[^a-zA-Z0-9\s]/g, '');
    } else if (mode === 'keepOnlyNumbers') {
      transformedValue = text.replace(/[^0-9]/g, '');
    } else if (mode === 'keepOnlyLetters') {
      transformedValue = text.replace(/[^a-zA-Z\s]/g, '');
    } else if (mode === 'keepOnlyAlphanumeric') {
      transformedValue = text.replace(/[^a-zA-Z0-9]/g, '');
    } else {
      transformedValue = text;
    }
  }
}
```

---

## Priority 4: UI/UX Enhancements

### 4.1 Transformation Templates

#### Implementation

**Create templates file:**
```javascript
// client/src/utils/transformationTemplates.js
export const transformationTemplates = [
  {
    id: 'full-name',
    name: 'Full Name from First + Last',
    description: 'Concatenate first and last name with space',
    transformation: 'concatenate',
    config: {
      concatenateFields: ['FirstName', 'LastName'],
      separator: ' '
    }
  },
  {
    id: 'email-validation',
    name: 'Email Validation',
    description: 'Validate email format, use default if invalid',
    transformation: 'validateFormat',
    config: {
      validationType: 'email',
      onInvalid: 'default',
      defaultValue: 'invalid@example.com'
    }
  },
  {
    id: 'date-add-30-days',
    name: 'Add 30 Days to Date',
    description: 'Add 30 days to source date field',
    transformation: 'dateArithmetic', // Would need to implement
    config: {
      operation: 'add',
      amount: 30,
      unit: 'days'
    }
  },
  // ... more templates
];
```

**UI Component:**
```javascript
// Add template selector above transformation dropdown
<div className="form-group">
  <label>Use Template (Optional)</label>
  <select
    value=""
    onChange={(e) => {
      if (e.target.value) {
        const template = transformationTemplates.find(t => t.id === e.target.value);
        if (template) {
          const updated = fieldMappings.map(m => {
            if (m.id === mapping.id) {
              return {
                ...m,
                transformation: template.transformation,
                ...template.config
              };
            }
            return m;
          });
          setFieldMappings(updated);
        }
      }
    }}
    style={{ fontSize: '12px', padding: '6px 10px', height: '32px', width: '100%' }}
  >
    <option value="">--Select Template--</option>
    {transformationTemplates.map(t => (
      <option key={t.id} value={t.id}>{t.name} - {t.description}</option>
    ))}
  </select>
</div>
```

### 4.2 Enhanced Preview

#### Implementation

**Add step-by-step preview:**
```javascript
// In preview response, include transformation steps:
{
  success: true,
  records: [{
    id: '...',
    fields: {
      'FieldName': {
        currentValue: 'old',
        newValue: 'new',
        transformationSteps: [
          { step: 1, description: 'Source value: "old"', value: 'old' },
          { step: 2, description: 'Applied uppercase transformation', value: 'OLD' },
          { step: 3, description: 'Final value', value: 'OLD' }
        ]
      }
    }
  }]
}
```

**UI Component:**
```javascript
// In preview modal, show transformation steps:
{previewData.records.map(record => (
  <div key={record.id}>
    {Object.entries(record.fields).map(([fieldName, fieldData]) => (
      <div key={fieldName}>
        <h4>{fieldName}</h4>
        {fieldData.transformationSteps && (
          <div style={{ marginLeft: '20px' }}>
            {fieldData.transformationSteps.map((step, idx) => (
              <div key={idx} style={{ 
                padding: '4px 8px', 
                marginBottom: '4px',
                backgroundColor: idx === fieldData.transformationSteps.length - 1 ? '#dbeafe' : '#f3f4f6'
              }}>
                Step {step.step}: {step.description} → {step.value}
              </div>
            ))}
          </div>
        )}
      </div>
    ))}
  </div>
))}
```

### 4.3 Save/Load Transformation Sets

#### Implementation

**Backend API:**
```javascript
// server/routes/updateObjectFields.js

// Save transformation set
router.post('/save-transformation-set', authenticate, authorize('all'), asyncHandler(async (req, res) => {
  const { name, description, sourceObject, targetObject, mappings } = req.body;
  // Save to database or file
  // Return saved set ID
}));

// Load transformation sets
router.get('/transformation-sets', authenticate, authorize('all'), asyncHandler(async (req, res) => {
  // Return list of saved transformation sets
}));

// Load specific transformation set
router.get('/transformation-sets/:id', authenticate, authorize('all'), asyncHandler(async (req, res) => {
  // Return transformation set details
}));
```

**Frontend:**
```javascript
// Add save/load buttons
<div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
  <button onClick={handleSaveTransformationSet}>Save Transformation Set</button>
  <button onClick={handleLoadTransformationSet}>Load Transformation Set</button>
</div>
```

### 4.4 Transformation History

#### Implementation

**State Management:**
```javascript
const [transformationHistory, setTransformationHistory] = useState([]);
const [historyIndex, setHistoryIndex] = useState(-1);

// On mapping change, add to history
useEffect(() => {
  if (fieldMappings.length > 0) {
    const newHistory = [...transformationHistory.slice(0, historyIndex + 1), JSON.parse(JSON.stringify(fieldMappings))];
    setTransformationHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    // Limit history to last 50 changes
    if (newHistory.length > 50) {
      setTransformationHistory(newHistory.slice(-50));
      setHistoryIndex(49);
    }
  }
}, [fieldMappings]);

// Undo/Redo functions
const handleUndo = () => {
  if (historyIndex > 0) {
    setHistoryIndex(historyIndex - 1);
    setFieldMappings(JSON.parse(JSON.stringify(transformationHistory[historyIndex - 1])));
  }
};

const handleRedo = () => {
  if (historyIndex < transformationHistory.length - 1) {
    setHistoryIndex(historyIndex + 1);
    setFieldMappings(JSON.parse(JSON.stringify(transformationHistory[historyIndex + 1])));
  }
};
```

---

## Priority 5: Performance and Reliability

### 5.1 Batch Processing Optimization

#### Implementation

**Backend Optimization:**
```javascript
// Process records in batches
async function processMappingsInBatches(records, mappings, batchSize = 100) {
  const batches = [];
  for (let i = 0; i < records.length; i += batchSize) {
    batches.push(records.slice(i, i + batchSize));
  }
  
  const results = [];
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(record => processRecordMappings(record, mappings))
    );
    results.push(...batchResults);
  }
  
  return results;
}

// Cache field metadata
const fieldMetadataCache = new Map();
function getFieldMetadata(objectName, fieldName) {
  const cacheKey = `${objectName}:${fieldName}`;
  if (fieldMetadataCache.has(cacheKey)) {
    return fieldMetadataCache.get(cacheKey);
  }
  // Fetch and cache
  // ...
}
```

### 5.2 Enhanced Error Handling

#### Implementation

**Error Collection:**
```javascript
// Track errors per record
const errors = [];

try {
  transformedValue = applyTransformation(...);
} catch (error) {
  errors.push({
    recordId: record.Id,
    field: mapping.targetField,
    error: error.message,
    sourceValue: sourceValue
  });
  
  // Based on error handling mode
  if (mapping.errorHandling === 'skip') {
    continue; // Skip this record
  } else if (mapping.errorHandling === 'default') {
    transformedValue = mapping.defaultValue || null;
  } else if (mapping.errorHandling === 'original') {
    transformedValue = sourceValue; // Use original value
  }
}

// Return errors in response
res.json({
  success: true,
  updatedCount: successCount,
  errorCount: errors.length,
  errors: errors.slice(0, 100) // Limit to first 100 errors
});
```

### 5.3 Validation Before Execution

#### Implementation

**Pre-execution Validation:**
```javascript
function validateMappings(mappings, sourceFields, targetFields) {
  const errors = [];
  const warnings = [];
  
  mappings.forEach((mapping, index) => {
    // Validate required fields
    if (!mapping.targetField) {
      errors.push(`Mapping ${index + 1}: Target field is required`);
    }
    
    if (mapping.transformation === 'copy' && !mapping.sourceField) {
      errors.push(`Mapping ${index + 1}: Source field is required for copy transformation`);
    }
    
    // Validate field types compatibility
    if (mapping.sourceField && mapping.targetField) {
      const sourceField = sourceFields.find(f => f.name === mapping.sourceField);
      const targetField = targetFields.find(f => f.name === mapping.targetField);
      
      if (sourceField && targetField) {
        if (!areTypesCompatible(sourceField.type, targetField.type, mapping.transformation)) {
          warnings.push(`Mapping ${index + 1}: Type mismatch between ${sourceField.type} and ${targetField.type}`);
        }
      }
    }
    
    // Validate transformation-specific requirements
    if (mapping.transformation === 'textReplace' && !mapping.findText) {
      errors.push(`Mapping ${index + 1}: Find text is required for text replacement`);
    }
    
    // Validate regex patterns
    if (mapping.transformation === 'textReplace' && mapping.useRegex) {
      try {
        new RegExp(mapping.findText);
      } catch (error) {
        errors.push(`Mapping ${index + 1}: Invalid regex pattern: ${error.message}`);
      }
    }
  });
  
  return { errors, warnings };
}

// Call before execution
const validation = validateMappings(mappings, sourceFields, targetFields);
if (validation.errors.length > 0) {
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    errors: validation.errors,
    warnings: validation.warnings
  });
}
```

---

## Implementation Phases

### Phase 1 (Week 1-2): Core Enhancements
- Text Replacement
- Default Value if Empty
- Data Type Conversion
- Enhanced Error Handling

### Phase 2 (Week 3-4): Conditional Logic
- Multiple Conditions (AND/OR)
- Additional Operators (isEmpty, startsWith, etc.)
- Case/Switch Statements

### Phase 3 (Week 5-6): Validation & Cleaning
- Format Validation
- Remove Special Characters
- Enhanced Validation Before Execution

### Phase 4 (Week 7-8): UI/UX Enhancements
- Transformation Templates
- Enhanced Preview
- Save/Load Transformation Sets

### Phase 5 (Week 9-10): Advanced Features
- Nested Conditionals
- Transformation History
- Performance Optimizations

---

## Testing Strategy

### Unit Tests
- Test each transformation function independently
- Test edge cases (null, empty, special characters)
- Test error handling

### Integration Tests
- Test transformation chains
- Test with real Salesforce data
- Test performance with large datasets

### User Acceptance Tests
- Test common use cases
- Test error scenarios
- Test UI responsiveness

---

## Migration Strategy

### Backward Compatibility
- Existing mappings continue to work
- New transformation options are additive
- Old conditional structure still supported (with migration path)

### Data Migration
- No database changes required (mappings stored in request)
- Frontend handles both old and new formats
- Gradual migration as users update mappings

---

## Documentation Requirements

1. **User Guide**: Step-by-step instructions for each transformation
2. **Examples**: Common use cases with sample data
3. **Troubleshooting**: Common errors and solutions
4. **API Documentation**: For any new endpoints

---

## Security Checklist

- [ ] Input validation for all user inputs
- [ ] Regex pattern length limits
- [ ] SQL injection prevention (if adding database storage)
- [ ] XSS prevention in preview/error messages
- [ ] Rate limiting for transformation execution
- [ ] Audit logging for transformation sets

