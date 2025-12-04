# Advanced Report Builder - Detailed Implementation Plan

## 1. Overview

### 1.1 Purpose
Create a modern, intuitive Report Builder with drag-and-drop functionality, visual query building, and streamlined workflow while maintaining the existing Report Builder for backward compatibility.

### 1.2 Key Principles
- **Visual First**: Drag-and-drop interface for building reports
- **Progressive Disclosure**: Show complexity only when needed
- **Contextual Help**: Inline guidance and tooltips
- **Real-time Preview**: See results as you build
- **Separation of Concerns**: Builder for creation, Reports tab for viewing/managing

---

## 2. Architecture & Navigation

### 2.1 Tab Structure
```
┌─────────────────────────────────────────────────────────┐
│  [Report Builder] [Advanced Builder] [Reports] [History] │
└─────────────────────────────────────────────────────────┘
```

- **Report Builder**: Existing builder (unchanged)
- **Advanced Builder**: New drag-and-drop builder (this plan)
- **Reports**: View, manage, and open saved reports
- **History**: Generated report history (existing)

### 2.2 Workflow Separation
```
Advanced Builder Tab:
  └─> Create/Edit Reports
      └─> Save → Goes to Reports tab

Reports Tab:
  └─> View Saved Reports
      └─> Open Report → View in Reports tab (not Builder)
      └─> Edit Report → Opens in Advanced Builder tab
      └─> Delete Report
```

---

## 3. UI Layout Design

### 3.1 Advanced Builder Layout (3-Panel Design)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Advanced Report Builder                                    [Save] [Preview] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────────────────────────────────┐   │
│  │                  │  │                                                │   │
│  │  OBJECT PANEL    │  │         VISUAL QUERY BUILDER                   │   │
│  │  (Left Sidebar)  │  │         (Center Canvas)                       │   │
│  │                  │  │                                                │   │
│  │  📦 Objects      │  │  ┌────────────────────────────────────────┐   │   │
│  │  └─ Project     │  │  │  [Primary Object: Project]             │   │   │
│  │     └─ Fields   │  │  └────────────────────────────────────────┘   │   │
│  │                  │  │         │                                     │   │
│  │  🔗 Relationships│  │         ▼                                     │   │
│  │  └─ Account      │  │  ┌────────────────────────────────────────┐   │   │
│  │     └─ Fields    │  │  │  [Related: Account]                    │   │   │
│  │                  │  │  │  └─ Name, Industry, Type               │   │   │
│  │  📋 Child Records│  │  └────────────────────────────────────────┘   │   │
│  │  └─ Cases       │  │         │                                     │   │
│  │     └─ Fields    │  │         ▼                                     │   │
│  │                  │  │  ┌────────────────────────────────────────┐   │   │
│  │                  │  │  │  [Subquery: Cases]                     │   │   │
│  │                  │  │  │  └─ Subject, Status, Priority           │   │   │
│  │                  │  │  └────────────────────────────────────────┘   │   │
│  │                  │  │                                                │   │
│  │                  │  │  ┌────────────────────────────────────────┐   │   │
│  │                  │  │  │  [Filters]                             │   │   │
│  │                  │  │  │  └─ Status = Active                    │   │   │
│  │                  │  │  └────────────────────────────────────────┘   │   │
│  │                  │  │                                                │   │
│  │                  │  │  ┌────────────────────────────────────────┐   │   │
│  │                  │  │  │  [Sort & Group]                        │   │   │
│  │                  │  │  │  └─ Sort: Name ASC                     │   │   │
│  │                  │  │  └────────────────────────────────────────┘   │   │
│  │                  │  │                                                │   │
│  └──────────────────┘  └──────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  PREVIEW PANEL (Bottom - Collapsible)                                │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Preview Data (10 rows)                    [Export] [Full View] │  │  │
│  │  │  ┌──────┬──────────┬──────────┬──────────┬──────────┐        │  │  │
│  │  │  │ Name │ Account  │ Industry │ Cases    │ Status   │        │  │  │
│  │  │  ├──────┼──────────┼──────────┼──────────┼──────────┤        │  │  │
│  │  │  │ ...  │ ...      │ ...      │ ...      │ ...      │        │  │  │
│  │  │  └──────┴──────────┴──────────┴──────────┴──────────┘        │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Panel Breakdown

#### **Left Panel: Object & Field Browser**
- **Collapsible Sections:**
  - 📦 **Primary Object**: Selected base object (e.g., Project)
  - 🔗 **Related Objects**: Parent relationships (e.g., Account, Contact)
  - 📋 **Child Records**: Subquery relationships (e.g., Cases, Objectives)
- **Field List**: Scrollable list with search
- **Drag Source**: Fields can be dragged to canvas

#### **Center Panel: Visual Query Builder**
- **Card-Based Layout**: Each component is a draggable card
- **Connection Lines**: Visual lines showing relationships
- **Drop Zones**: Clear areas for dropping fields
- **Inline Editing**: Click to edit filters, sort, etc.

#### **Bottom Panel: Live Preview**
- **Collapsible**: Can be minimized
- **Real-time Updates**: Updates as you build
- **Quick Actions**: Export, full view buttons

---

## 4. Visual Components Design

### 4.1 Object Card
```
┌─────────────────────────────────────┐
│  📦 Project                    [×]  │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │  Name                    [✓]  │  │
│  │  Status                  [✓]  │  │
│  │  Start Date             [✓]  │  │
│  │  Account                [✓]  │  │
│  └───────────────────────────────┘  │
│  [+ Add Field]                       │
└─────────────────────────────────────┘
```

### 4.2 Relationship Card
```
┌─────────────────────────────────────┐
│  🔗 Account (via Account__c)  [×]  │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │  Name                    [✓]  │  │
│  │  Industry                [✓]  │  │
│  │  Type                    [✓]  │  │
│  └───────────────────────────────┘  │
│  [+ Add Field]                       │
└─────────────────────────────────────┘
```

### 4.3 Subquery Card
```
┌─────────────────────────────────────┐
│  📋 Cases (Child Records)      [×]  │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │  Subject                 [✓]  │  │
│  │  Status                 [✓]  │  │
│  │  Priority               [✓]  │  │
│  └───────────────────────────────┘  │
│  [+ Add Field]                       │
│  Count: 5 records                    │
└─────────────────────────────────────┘
```

### 4.4 Filter Card
```
┌─────────────────────────────────────┐
│  🔍 Filters                    [×]  │
├─────────────────────────────────────┤
│  ┌────────────────────────────────┐ │
│  │  Status = Active          [×]  │ │
│  │  Account.Industry = Tech  [×]  │ │
│  └────────────────────────────────┘ │
│  [+ Add Filter]                      │
└─────────────────────────────────────┘
```

### 4.5 Sort & Group Card
```
┌─────────────────────────────────────┐
│  📊 Sort & Group                [×]  │
├─────────────────────────────────────┤
│  Sort By: [Name ▼] [ASC ▼]          │
│  Group By: [Account ▼]              │
└─────────────────────────────────────┘
```

---

## 5. Drag-and-Drop Operations

### 5.1 Drag Sources
- **Fields from Left Panel**: Can drag any field
- **Cards in Canvas**: Can reorder cards
- **Relationship Connections**: Can drag to create relationships

### 5.2 Drop Targets
- **Object Card**: Drop fields to add to selection
- **Relationship Card**: Drop fields from related object
- **Subquery Card**: Drop fields for child records
- **Filter Card**: Drop fields to create filters
- **Canvas**: Drop to create new cards

### 5.3 Visual Feedback
- **Drag Preview**: Shows field name being dragged
- **Drop Zones**: Highlight when dragging over valid target
- **Invalid Drop**: Red highlight with "X" icon
- **Connection Lines**: Animated lines showing relationships

---

## 6. Mode of Operations

### 6.1 Creating a New Report

**Step 1: Select Primary Object**
```
User Action: Click "Select Object" or drag object from left panel
Result: Primary object card appears in canvas
```

**Step 2: Add Fields**
```
User Action: Drag fields from left panel to object card
Result: Fields appear in card with checkmarks
Alternative: Click "+ Add Field" button in card
```

**Step 3: Add Relationships (Optional)**
```
User Action: Click "+ Add Relationship" or drag relationship from left panel
Result: Relationship card appears connected to primary object
User Action: Drag fields from relationship to relationship card
Result: Related fields added to report
```

**Step 4: Add Subqueries (Optional)**
```
User Action: Click "+ Add Child Records" or drag subquery from left panel
Result: Subquery card appears below primary object
User Action: Drag fields from subquery to subquery card
Result: Child record fields added to report
```

**Step 5: Add Filters (Optional)**
```
User Action: Click "+ Add Filter" or drag field to filter card
Result: Filter builder opens
User Action: Select operator and enter value
Result: Filter added to card
```

**Step 6: Configure Sort & Group (Optional)**
```
User Action: Click "Sort & Group" card
Result: Dropdowns appear
User Action: Select sort field and order
Result: Sort configured
```

**Step 7: Preview & Save**
```
User Action: Click "Preview" button
Result: Preview panel shows sample data
User Action: Click "Save" button
Result: Report saved, user redirected to Reports tab
```

### 6.2 Editing an Existing Report

**From Reports Tab:**
```
User Action: Click "Edit" on a saved report
Result: Advanced Builder opens with report loaded
User Action: Modify cards, fields, filters
Result: Changes reflected in preview
User Action: Click "Save"
Result: Report updated, user stays in Reports tab
```

### 6.3 Viewing a Report

**From Reports Tab:**
```
User Action: Click "View" on a saved report
Result: Report opens in full-screen view within Reports tab
Features: Export, Print, Share options available
User Action: Click "Edit" to modify
Result: Opens in Advanced Builder tab
```

---

## 7. Feature Comparison

### 7.1 Current Report Builder vs Advanced Builder

| Feature | Current Builder | Advanced Builder |
|---------|----------------|------------------|
| **UI Style** | Form-based | Visual drag-and-drop |
| **Field Selection** | Checkbox list | Drag fields to cards |
| **Relationship Selection** | Tree browser | Visual relationship cards |
| **Filter Building** | Form inputs | Visual filter cards |
| **Preview** | Separate modal | Inline bottom panel |
| **Workflow** | Builder + View mixed | Builder for create, Reports for view |
| **Visual Feedback** | Limited | Rich drag-and-drop feedback |
| **Learning Curve** | Medium | Low (more intuitive) |

---

## 8. Technical Implementation

### 8.1 Technology Stack
- **Drag & Drop**: `react-beautiful-dnd` or `@dnd-kit/core`
- **Canvas Layout**: Custom grid system with `react-grid-layout`
- **State Management**: React Context + useState (or Redux if needed)
- **Styling**: CSS Modules (matching current Report Builder colors/fonts)
- **Icons**: Lucide React (same as current)

### 8.2 Component Structure
```
AdvancedReportBuilder/
├── AdvancedReportBuilder.js (Main container)
├── components/
│   ├── ObjectPanel/ (Left sidebar)
│   │   ├── ObjectBrowser.js
│   │   ├── FieldList.js
│   │   └── RelationshipTree.js
│   ├── VisualCanvas/ (Center canvas)
│   │   ├── QueryCanvas.js
│   │   ├── ObjectCard.js
│   │   ├── RelationshipCard.js
│   │   ├── SubqueryCard.js
│   │   ├── FilterCard.js
│   │   └── SortGroupCard.js
│   ├── PreviewPanel/ (Bottom panel)
│   │   ├── PreviewTable.js
│   │   └── PreviewActions.js
│   └── shared/
│       ├── DragHandle.js
│       ├── ConnectionLine.js
│       └── FieldChip.js
└── hooks/
    ├── useDragAndDrop.js
    ├── useQueryBuilder.js
    └── usePreview.js
```

### 8.3 State Management
```javascript
{
  reportConfig: {
    name: '',
    objectType: '',
    fields: [],
    relationships: [],
    subqueries: [],
    filters: [],
    sortBy: null,
    groupBy: null,
    limit: 10000
  },
  canvas: {
    cards: [],
    connections: [],
    selectedCard: null
  },
  preview: {
    data: [],
    loading: false,
    error: null
  }
}
```

### 8.4 API Integration
- Reuse existing backend endpoints
- `/api/reports/preview` - For live preview
- `/api/reports/generate` - For saving reports
- `/api/update-object-fields/relationships/:objectType` - For relationships
- `/api/update-object-fields/fields/:objectType` - For fields

---

## 9. Color Scheme & Styling

### 9.1 Colors (Matching Current)
- **Primary**: `#08979C` (Teal)
- **Background**: `#FFFFFF`
- **Card Background**: `#F9FAFB`
- **Border**: `#E5E7EB`
- **Text**: `#111827`
- **Secondary Text**: `#6B7280`
- **Accent**: `#F59E0B` (Orange for warnings/actions)

### 9.2 Typography (Matching Current)
- **Font Family**: `'Poppins', sans-serif`
- **Headings**: `font-weight: 600`
- **Body**: `font-weight: 400`
- **Font Sizes**: `12px`, `13px`, `14px`, `15px`, `16px`

### 9.3 Modern UI Elements
- **Cards**: Rounded corners (`border-radius: 8px`), subtle shadows
- **Buttons**: Rounded, with hover effects
- **Inputs**: Modern styled with focus states
- **Drag Handles**: Visible grip icon
- **Connection Lines**: Smooth bezier curves
- **Animations**: Smooth transitions (200-300ms)

---

## 10. User Experience Enhancements

### 10.1 Onboarding
- **First-time Tooltip**: Guide users through first report creation
- **Empty State**: Helpful message when canvas is empty
- **Inline Help**: Question mark icons with tooltips

### 10.2 Error Handling
- **Visual Errors**: Red borders on invalid cards
- **Error Messages**: Clear, actionable error messages
- **Validation**: Real-time validation as user builds

### 10.3 Performance
- **Lazy Loading**: Load relationships on-demand
- **Debounced Preview**: Preview updates after 500ms of inactivity
- **Optimistic Updates**: Immediate UI feedback

### 10.4 Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels on all interactive elements
- **Focus Management**: Clear focus indicators

---

## 11. Implementation Phases

### Phase 1: Core Structure (Week 1)
- [ ] Create Advanced Builder tab
- [ ] Implement 3-panel layout
- [ ] Basic drag-and-drop for fields
- [ ] Object card component

### Phase 2: Relationships (Week 2)
- [ ] Relationship card component
- [ ] Visual connection lines
- [ ] Cross-object field selection
- [ ] Relationship browser integration

### Phase 3: Advanced Features (Week 3)
- [ ] Subquery card component
- [ ] Filter card with builder
- [ ] Sort & Group card
- [ ] Live preview panel

### Phase 4: Polish & Integration (Week 4)
- [ ] Reports tab integration
- [ ] Save/Edit workflow
- [ ] Error handling
- [ ] Performance optimization
- [ ] Testing & bug fixes

---

## 12. Sample User Journey

### Scenario: Create "Active Projects with Account Details" Report

1. **User opens Advanced Builder tab**
   - Sees empty canvas with helpful message
   - Left panel shows available objects

2. **User selects "Project" object**
   - Drags "Project" from left panel to canvas
   - Object card appears with field list

3. **User adds fields**
   - Drags "Name", "Status", "Start Date" to card
   - Fields appear with checkmarks

4. **User adds Account relationship**
   - Clicks "+ Add Relationship" on Project card
   - Selects "Account" from dropdown
   - Relationship card appears connected to Project card
   - Drags "Account Name", "Industry" to relationship card

5. **User adds filter**
   - Clicks "+ Add Filter"
   - Drags "Status" field to filter card
   - Selects "equals" operator
   - Enters "Active"
   - Filter appears in filter card

6. **User previews**
   - Clicks "Preview" button
   - Preview panel shows sample data
   - Sees Project Name, Status, Account Name, Industry columns

7. **User saves**
   - Clicks "Save" button
   - Enters report name: "Active Projects with Accounts"
   - Report saved
   - User redirected to Reports tab
   - Report appears in saved reports list

8. **User views report**
   - Clicks "View" on saved report
   - Report opens in full view within Reports tab
   - Can export, print, or edit

---

## 13. Benefits of This Approach

1. **Intuitive**: Visual representation is easier to understand
2. **Efficient**: Drag-and-drop is faster than form filling
3. **Flexible**: Easy to add/remove components
4. **Modern**: Meets current UI/UX expectations
5. **Maintainable**: Clear separation of concerns
6. **Scalable**: Easy to add new features

---

## 14. Questions for Review

1. **Layout Preference**: Do you prefer the 3-panel layout or would you like a different arrangement?

2. **Card Style**: Are the card-based components clear, or would you prefer a different visual style?

3. **Preview Location**: Should preview be at the bottom (collapsible) or in a side panel?

4. **Relationship Visualization**: Do you prefer connection lines or just visual grouping?

5. **Mobile Support**: Should this be responsive for tablet/mobile, or desktop-only?

6. **Migration Path**: Should there be an option to convert existing reports to the new format?

---

## 15. Next Steps

Once you approve this plan, I will:
1. Create the component structure
2. Implement drag-and-drop functionality
3. Build the visual query builder
4. Integrate with existing backend
5. Add Reports tab integration
6. Test and refine

**Estimated Timeline**: 3-4 weeks for full implementation

---

Please review this plan and let me know:
- Any changes or additions you'd like
- Approval to proceed with implementation
- Answers to the questions in Section 14



