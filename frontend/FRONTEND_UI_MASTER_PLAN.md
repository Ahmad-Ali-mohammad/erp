# Frontend Master Plan (Construction ERP)

## 1) الهدف
بناء واجهات احترافية كاملة لنظام المقاولات الحالي، مع تمثيل كل قدرات الباك إند الموجودة حالياً في:
- `core`
- `projects`
- `procurement`
- `finance`

وتغطية جميع دورات الاعتماد (Submit / Approve / Reject / Close / Send / Receive / Cancel / Generate Invoice) بشكل واضح وقابل للتتبع.

## 2) الوضع الحالي
- الواجهة الحالية Minimal (صفحة واحدة + فحص `health`).
- لا توجد بنية شاشات للـ modules.
- لا توجد مصادقة JWT في الواجهة.
- لا توجد إدارة صلاحيات أو workflows على مستوى UI.

## 3) اتجاه التصميم الاحترافي (Design Direction)
- هوية بصرية: `Industrial Finance` (عملي + واضح + جاد).
- ألوان:
  - `--bg`: `#F3F5F8`
  - `--surface`: `#FFFFFF`
  - `--primary`: `#0F2A43`
  - `--accent`: `#C89B3C`
  - `--success`: `#1E8E5A`
  - `--warning`: `#CC7A00`
  - `--danger`: `#C62828`
- خطوط:
  - عربي: `Cairo`
  - لاتيني/رقمي: `IBM Plex Sans`
- دعم RTL كامل + استجابة Mobile/Tablet/Desktop.
- مكونات موحدة للحالات: `Badge`, `Workflow Timeline`, `Tables`, `Dialogs`, `Toasts`, `Skeletons`, `Empty States`.

## 4) بنية التطبيق (Next.js App Router)
اقتراح بنية الملفات:

```txt
src/
  app/
    (public)/
      page.tsx                 # Landing
      modules/page.tsx         # استعراض المزايا
      about/page.tsx
    (auth)/
      login/page.tsx
    (dashboard)/
      layout.tsx               # Sidebar + Header + Breadcrumbs
      dashboard/page.tsx
      projects/
        page.tsx
        [id]/page.tsx
      procurement/
        suppliers/page.tsx
        warehouses/page.tsx
        materials/page.tsx
        purchase-requests/page.tsx
        purchase-orders/page.tsx
        stock-transactions/page.tsx
      finance/
        accounts/page.tsx
        journal-entries/page.tsx
        invoices/page.tsx
        payments/page.tsx
        progress-billings/page.tsx
        revenue-recognition/page.tsx
      admin/
        roles/page.tsx
        users/page.tsx
        audit-logs/page.tsx
  components/
    ui/
    layout/
    tables/
    forms/
    workflow/
  features/
    core/
    projects/
    procurement/
    finance/
  lib/
    api/
      client.ts
      endpoints.ts
      query-keys.ts
    auth/
      token-store.ts
      guards.ts
    utils/
      format.ts
      errors.ts
```

## 5) طبقة البيانات والتكامل
- اعتماد `TanStack Query` لإدارة الكاش وجلب البيانات.
- اعتماد `React Hook Form + Zod` لكل الفورمز.
- Client موحد للـ API:
  - base URL من `NEXT_PUBLIC_API_BASE_URL`
  - إضافة `Authorization: Bearer <access>`
  - Refresh token تلقائي عند `401` عبر `/api/auth/token/refresh/`
  - توحيد التعامل مع أخطاء DRF (`field errors` + `non_field_errors`)
- دعم pagination/filter/search/ordering بما يتوافق مع DRF.

## 6) الصلاحيات (Role-Aware UX)
- تطبيق `Route Guards` حسب صلاحيات الصفحات.
- إظهار/إخفاء أزرار الإجراءات حسب الدور المتوقع.
- الحفاظ على تحقق نهائي من الباك إند (`403` يعرض رسالة واضحة).
- ملاحظة تنفيذية: يفضل إضافة endpoint `me` أو تضمين `role` في JWT claims لعرض صلاحيات دقيق دون تخمين.

## 7) خريطة الشاشات وربطها بالباك إند

### 7.1 المصادقة والتهيئة
- Login:
  - `POST /api/auth/token/`
  - تخزين `access/refresh`.
- Session bootstrap:
  - فحص صحة الجلسة.
  - Redirect حسب حالة التوثيق.
- Health widget:
  - `GET /api/v1/core/health/`

### 7.2 Core (Admin)
- Roles:
  - CRUD عبر `/api/v1/core/roles/`
- Users:
  - CRUD عبر `/api/v1/core/users/`
- Audit Logs:
  - List + filter/search عبر `/api/v1/core/audit-logs/`

### 7.3 Projects
- Projects List/Details + create/edit.
- Project Close action:
  - `POST /api/v1/projects/projects/{id}/close/`
- Cost Summary dashboard:
  - `GET /api/v1/projects/projects/{id}/cost-summary/`
- Phases CRUD.
- BoQ Items CRUD.
- Cost Codes CRUD (hierarchical).
- Budget Lines CRUD.
- Cost Records CRUD.
- Change Orders:
  - CRUD draft
  - submit/approve/reject:
    - `/api/v1/projects/change-orders/{id}/submit/`
    - `/approve/`
    - `/reject/`

### 7.4 Procurement
- Suppliers CRUD.
- Warehouses CRUD.
- Materials CRUD.
- Purchase Requests:
  - CRUD + items
  - submit/approve/reject
- Purchase Orders:
  - CRUD draft + items
  - send/receive/cancel
  - receive modal بكميات لكل item
- Stock Transactions CRUD.

### 7.5 Finance
- Accounts CRUD.
- Journal Entries CRUD + lines (توازن مدين/دائن).
- Invoices:
  - CRUD + items
  - submit/approve/reject
  - حالات `issued/partially_paid/paid`.
- Payments:
  - CRUD
  - submit/approve/reject
- Progress Billings:
  - CRUD draft
  - submit/approve/reject
  - generate invoice
- Revenue Recognition:
  - CRUD draft
  - submit/approve/reject
  - طرق: `percentage_of_completion`, `completed_contract`

## 8) تصميم كل شاشة (Professional UX Patterns)
- أي شاشة قائمة تحتوي:
  - Toolbar: `search + filters + sort + export`
  - DataTable: pagination + row actions
  - Empty state عملي مع CTA
- أي شاشة تفاصيل تحتوي:
  - Header (identifier + status badge + actions)
  - Tabs (Overview, Financial, Timeline, Documents)
  - Activity timeline لحالات workflow
- أي transition action (`submit/approve/reject...`) عبر Dialog:
  - تأكيد
  - سبب الرفض إلزامي عند `reject`
  - optimistic feedback + refetch

## 9) الـ Workflows الحرجة التي يجب تمثيلها
- Project lifecycle:
  - open -> completed (close)
- Change Order lifecycle:
  - draft -> pending_approval -> approved/rejected
- PR lifecycle:
  - draft -> pending_approval -> approved/rejected
- PO lifecycle:
  - draft -> sent -> partially_received/received -> cancelled (بشروط)
- Invoice lifecycle:
  - draft -> pending_approval -> issued -> partially_paid/paid أو rejected
- Payment lifecycle:
  - pending -> confirmed/failed
- Progress Billing lifecycle:
  - draft -> pending_approval -> approved -> invoiced أو rejected
- Revenue Recognition lifecycle:
  - draft -> pending_approval -> approved أو rejected

## 10) المكونات المشتركة المطلوبة
- `StatusBadge` موحد لكل statuses.
- `WorkflowActionBar` (Submit/Approve/Reject...).
- `ReasonDialog` لرفض السجلات.
- `EntityTable` موحد يدعم DRF pagination.
- `FormSection` + `FieldError` موحد.
- `Amount` formatter (SAR + decimals).
- `Date` formatter (Asia/Riyadh).

## 11) خطة التنفيذ المرحلية

### المرحلة A: Foundation (3-4 أيام)
- إعداد routing groups.
- بناء layout رئيسي + sidebar + header.
- إضافة auth + token refresh + route guards.
- setup `TanStack Query`, `RHF`, `Zod`.
- نظام design tokens + المكونات الأساسية.

### المرحلة B: Core + Projects (5-7 أيام)
- Core pages: roles/users/audit logs.
- Projects pages: projects, phases, boq, cost-codes, budget-lines, cost-records.
- cost-summary visualization.
- change-order workflows.
- project close flow.

### المرحلة C: Procurement (5-6 أيام)
- master data (suppliers/warehouses/materials).
- purchase requests workflows.
- purchase orders workflows (send/receive/cancel).
- stock transactions.

### المرحلة D: Finance (6-8 أيام)
- accounts, journal entries.
- invoices + payments workflows.
- progress billings + generate invoice.
- revenue recognition workflows.

### المرحلة E: Polish + QA (4-5 أيام)
- accessibility pass.
- loading/error/empty states كاملة.
- responsive refinement.
- instrumentation + logging UI errors.
- e2e critical flows.

## 12) خطة الاختبارات
- Unit:
  - formatters, validators, workflow guards.
- Integration:
  - forms with API mocks.
- E2E (Playwright):
  - login
  - create project + cost code + change order approve
  - PR->PO send/receive/cancel
  - invoice->payment approve
  - progress billing approve + generate invoice
  - revenue recognition approve

## 13) Definition of Done
- كل endpoint في الباك إند له شاشة/إجراء ممثل في الواجهة.
- كل workflow action لديه:
  - زر واضح
  - Dialog تأكيد
  - رسائل نجاح/فشل
- دعم RTL + mobile.
- لا يوجد blocker في flows الحرجة.
- نجاح lint + e2e critical suite.

## 14) المخاطر والتنبيهات
- غياب `me` endpoint أو role claims قد يحد دقة إظهار الصلاحيات في الواجهة.
- بعض KPIs التجميعية تحتاج endpoints مخصصة لتحسين الأداء.
- اعتماد كبير على دقة status transitions في UI مقابل backend validations.

## 15) أولويات التنفيذ الفورية (Next Step)
1. تنفيذ `Foundation` بالكامل.
2. مباشرةً بناء Module `Projects` لأنه مرجعية باقي الوحدات.
3. بعدها `Procurement` و`Finance` مع workflows الكاملة.
