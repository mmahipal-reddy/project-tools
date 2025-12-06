# GPC-Filter Enable Guide

## ✅ Feature is Now Enabled

The GPC-Filter feature has been fully implemented. To enable it, set the following environment variables:

### Backend (.env file in root directory)
```bash
ENABLE_GPC_FILTER=true
```

### Frontend (client/.env file)
```bash
REACT_APP_ENABLE_GPC_FILTER=true
```

After setting these, restart both the backend and frontend servers.

---

## 📍 User Preferences Configuration UI Location

**The User Preferences UI is located in the Settings page:**

1. Navigate to: **Settings** (from the sidebar or user menu)
2. Scroll down to the section: **"Content Filtering Preferences"**
3. You'll see:
   - **Interested Accounts** - Searchable multi-select dropdown
   - **Interested Projects** - Searchable multi-select dropdown
   - **Save Preferences** button

### How to Configure:
1. Click on "Interested Accounts" field
2. Type at least 2 characters to search for accounts
3. Select accounts from the dropdown
4. Repeat for "Interested Projects"
5. Click "Save Preferences"

The preferences will be saved and applied automatically to all dashboards and reports.

---

## 🎯 Pages with GPC-Filter Integration

### ✅ Fully Integrated:
1. **Crowd Dashboard** - All widgets filtered
2. **PM Approvals** - Records and summary filtered
3. **Case Management** - Cases filtered (in progress)

### 📋 Reporting Pages to Integrate:
1. **Case Analytics Dashboard** (`/case-analytics`)
2. **Contributor Payments Dashboard** (`/contributor-payments`)
3. **Work Stream Reporting** (`/workstream-reporting`)
4. **Work Stream Analytics** (`/workstream-management` - Analytics tab)
5. **Project Performance Dashboard** (`/project-performance`)
6. **Contributor Time Status Dashboard** (`/contributor-time-status`)

### ❌ Excluded (as requested):
- Report Builder
- Advanced Report Builder
- Scheduled Reports

---

## 🔧 Current Implementation Status

### Phase 1-5: ✅ Complete
- Backend API
- Frontend UI Components
- Global State Management
- Filter Toggle Component
- Crowd Dashboard Integration

### Phase 6: 🔄 In Progress
- PM Approvals Integration (partially done)

### Phase 7-10: 📋 Pending
- Case Management Integration
- Backend Query Filtering
- Reporting Pages Integration

---

## 🚀 Next Steps

The remaining integrations follow the same pattern as Crowd Dashboard. Each page needs:
1. Import `useGPCFilter` and `GPCFilterToggle`
2. Get filter params: `const { getFilterParams } = useGPCFilter();`
3. Apply to API calls: `applyGPCFilterToParams(params, getFilterParams())`
4. Add `<GPCFilterToggle />` component to the page

