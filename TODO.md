# MedFlow Responsive Refactoring Plan

## Overview
Refactor the MedFlow frontend to be fully responsive across all screen sizes:
- Mobile phones (320px – 640px)
- Tablets (640px – 1024px)  
- Laptops (1024px – 1280px)
- Desktop screens (1280px+)

---

## Phase 1: Responsive Sidebar Navigation ✅
**Files:** `src/components/layout/Sidebar.tsx`, `src/components/layout/AppLayout.tsx`

- [x] Add mobile state management (open/close) with React state
- [x] Desktop (lg+): Full sidebar visible with icons + labels (current behavior)
- [x] Tablet (md to lg): Collapsible narrow sidebar — icons only, tooltip labels
- [x] Mobile (<md): Sidebar hidden by default
- [x] Add hamburger menu button in a mobile top header bar
- [x] Slide-in drawer navigation on mobile with backdrop overlay
- [x] Close sidebar on navigation (mobile)
- [x] Close sidebar on backdrop click (mobile)

---

## Phase 2: Dashboard Responsiveness ✅
**Files:** `src/pages/DashboardPage.tsx`, `src/components/dashboard/ChartsSection.tsx`, `src/components/dashboard/HourlyRevenueChart.tsx`

- [x] KPI cards grid: responsive gap sizing
- [x] Charts: replace fixed heights with responsive values (`h-[220px] sm:h-[260px] md:h-[300px]`)
- [x] Bottom row panels: responsive grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- [x] Scale heading typography: `text-xl md:text-2xl`
- [x] Responsive spacing: `gap-3 md:gap-4 lg:gap-5`, `space-y-4 md:space-y-6`
- [x] ChartsSection bar chart: responsive label sizes (`text-[8px] sm:text-[10px] md:text-xs`)
- [x] HourlyRevenueChart: responsive container height with `ResponsiveContainer`

---

## Phase 3: Inventory Page — Tables + Forms ✅
**Files:** `src/pages/inventory/InventoryPage.tsx`, `src/pages/inventory/StockCountsPage.tsx`, `src/pages/inventory/ControlledSubstancesPage.tsx`

- [x] Header: stack title and buttons vertically on mobile (`flex-col sm:flex-row`)
- [x] Filter bar: improve wrapping on small screens
- [x] Table: desktop table preserved with `hidden md:block`
- [x] Mobile card-view alternative (`md:hidden`) — stacked cards with key info
- [x] Each card shows: Product name, SKU, Category, Stock, Price, Status, Actions
- [x] ItemForm: `grid-cols-1 md:grid-cols-2`
- [x] Action buttons: `min-h-[40px]` touch target size
- [x] StockCountsPage: responsive KPIs (2-col grid), mobile card view, desktop table
- [x] ControlledSubstancesPage: responsive header, mobile card view, desktop table

---

## Phase 4: POS System Responsiveness ✅
**Files:** `src/pages/sales/pos/ProductSearch.tsx`, `src/pages/sales/pos/CartPanel.tsx`

- [x] ProductSearch grid: `grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]`
- [x] ProductSearch: smaller card padding on mobile (`p-2.5 sm:p-3`)
- [x] CartPanel: responsive padding and typography
- [x] Process Sale button: `min-h-[44px]` touch-friendly
- [x] Product name/SKU: responsive text sizes

---

## Phase 5: Sales Pages ✅
**Files:** `src/pages/sales/SalesPage.tsx`, `src/pages/sales/OverviewDashboard.tsx`, `src/pages/sales/history/SalesHistoryTable.tsx`

- [x] SalesPage tabs: first-word-only on mobile (`sm:hidden` / `hidden sm:inline`), scrollable
- [x] SalesPage: responsive heading size (`text-xl md:text-2xl`)
- [x] SalesHistoryTable: mobile card-view for transactions (`md:hidden`)
- [x] Each card shows: Invoice #, Date, Staff, Total, Status, Payment method
- [x] Filter bar: stack vertically on mobile (`flex-col sm:flex-row`)
- [x] OverviewDashboard: responsive KPIs (2-col grid), responsive chart heights with `ResponsiveContainer`

---

## Phase 6: Reports & Admin Pages ✅
**Files:** `src/pages/reports/ReportsPage.tsx`, `src/pages/admin/AdminPage.tsx`

- [x] ReportsPage KPI grid: responsive gap `gap-3 md:gap-4`
- [x] ReportsPage tabs: scrollable (`scrollbar-none`), mobile first-word labels
- [x] ReportsPage heading: `text-xl md:text-2xl`
- [x] AdminPage tabs: responsive sizing (`text-xs md:text-sm`, `px-3 md:px-4`), mobile first-word labels
- [x] AdminPage: responsive heading (`text-lg md:text-xl`) and breadcrumb (`text-xs md:text-sm`)

---

## Phase 7: Global UI Component Improvements ✅
**Files:** `src/components/ui/Modal.tsx`

- [x] Modal: bottom-sheet on mobile (`items-end sm:items-center`, `rounded-t-2xl sm:rounded-2xl`)
- [x] Modal: `max-h-[95vh] sm:max-h-[90vh]` for more space on mobile
- [x] Modal: responsive padding (`px-4 md:px-6`, `py-3 md:py-4`)
- [x] Modal: close button with `min-h-[36px] min-w-[36px]` touch target
- [x] Modal: responsive title size (`text-base md:text-lg`)

---

## Phase 8: Profile & Auth Pages ✅
**Files:** `src/pages/profile/ProfilePage.tsx`, `src/pages/auth/LoginPage.tsx`

- [x] ProfilePage: responsive spacing (`space-y-4 md:space-y-6`)
- [x] ProfilePage: responsive card padding (`p-4 md:p-6`)
- [x] ProfilePage: responsive headings (`text-xl md:text-2xl`, `text-sm md:text-base`)
- [x] ProfilePage: Connected Accounts & Security sections stack on mobile (`flex-col sm:flex-row`)
- [x] LoginPage: responsive card padding (`p-5 sm:p-8`), rounded corners (`rounded-2xl sm:rounded-3xl`)
- [x] LoginPage: responsive logo size and heading

---

## Files Edited (19 total)

| # | File | Phase | Status |
|---|------|-------|--------|
| 1 | `src/components/layout/AppLayout.tsx` | 1 | ✅ Complete |
| 2 | `src/components/layout/Sidebar.tsx` | 1 | ✅ Complete |
| 3 | `src/pages/DashboardPage.tsx` | 2 | ✅ Complete |
| 4 | `src/components/dashboard/ChartsSection.tsx` | 2 | ✅ Complete |
| 5 | `src/components/dashboard/HourlyRevenueChart.tsx` | 2 | ✅ Complete |
| 6 | `src/pages/inventory/InventoryPage.tsx` | 3 | ✅ Complete |
| 7 | `src/pages/inventory/StockCountsPage.tsx` | 3 | ✅ Complete |
| 8 | `src/pages/inventory/ControlledSubstancesPage.tsx` | 3 | ✅ Complete |
| 9 | `src/pages/sales/pos/ProductSearch.tsx` | 4 | ✅ Complete |
| 10 | `src/pages/sales/pos/CartPanel.tsx` | 4 | ✅ Complete |
| 11 | `src/pages/sales/SalesPage.tsx` | 5 | ✅ Complete |
| 12 | `src/pages/sales/history/SalesHistoryTable.tsx` | 5 | ✅ Complete |
| 13 | `src/pages/sales/OverviewDashboard.tsx` | 5 | ✅ Complete |
| 14 | `src/pages/reports/ReportsPage.tsx` | 6 | ✅ Complete |
| 15 | `src/pages/admin/AdminPage.tsx` | 6 | ✅ Complete |
| 16 | `src/components/ui/Modal.tsx` | 7 | ✅ Complete |
| 17 | `src/pages/profile/ProfilePage.tsx` | 8 | ✅ Complete |
| 18 | `src/pages/auth/LoginPage.tsx` | 8 | ✅ Complete |

---

## Known Pre-existing Issues (Not caused by responsive refactor)
- `src/components/layout/Sidebar.tsx` line 185: `Cannot find name 'POSNavItem'`
- `src/pages/reports/ReportsPage.tsx` lines 125/128: pre-existing TS errors

---

## Followup Steps
- [ ] Test on multiple viewport sizes (320px, 375px, 768px, 1024px, 1280px, 1440px)
- [ ] Verify no layout breaks at breakpoint transitions
- [ ] Ensure touch targets are adequate on mobile (min 40px)
- [ ] Check performance on mobile — no unnecessary DOM elements
- [ ] Verify charts resize correctly
- [ ] Test sidebar drawer open/close on mobile
- [ ] Test POS cart slide-up on mobile
