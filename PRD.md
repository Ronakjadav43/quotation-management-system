# Product Requirements Document (PRD)
## Quotation Management System — Electrical Services

**Project:** Quotation Management System  
**Domain:** Electrical Service Connections (Gujarat Electricity Board)  
**Stack:** Next.js 16 · Prisma v7 · PostgreSQL · NextAuth v4 · Tailwind CSS v4  
**Date:** April 2026  
**Status:** MVP Complete — Dev Server Running

---

## 1. Project Overview

A full-stack internal web application for managing electrical service connection quotations. The system allows staff to:

- Manage customers
- Build quotations by selecting applicable charge sections
- Auto-calculate charges from a JSON-based pricing rule engine
- Track quotation status (Draft → Final → Approved/Rejected)
- Export printable quotation documents
- Manage and version the pricing rules JSON
- View revenue analytics and reports

---

## 2. Background & Problem Statement

Electrical service connections require calculating multiple charge types (Registration, Fixed Service Line, Service Line Shifting, Security Deposit) based on:

- Load in kW (with slab-based pricing)
- Service type (Residential / Commercial / Industrial)
- Phase type (Single Phase / Three Phase)
- Late fee applicability
- Formula-based pricing (e.g., ₹21,000 + ₹1,100 per kW above 20 kW)

Previously these calculations were done manually, leading to inconsistencies. The system replaces this with a configurable JSON-based calculation engine.

---

## 3. System Architecture

```
Frontend (Next.js UI)
        ↓
Server Actions / API Routes
        ↓
┌───────────────┬─────────────────┬──────────────┬──────────────────┐
│ Calculation   │   Prisma ORM    │ PDF / Print  │ Auth & Role      │
│ Engine        │   (Prisma v7)   │ (Browser     │ Control          │
│ (TypeScript)  │        ↓        │  print API)  │ (NextAuth v4)    │
│               │  PostgreSQL DB  │              │                  │
└───────────────┴─────────────────┴──────────────┴──────────────────┘
```

---

## 4. User Roles

| Role    | Permissions                                               |
|---------|-----------------------------------------------------------|
| ADMIN   | Full access — manage users, pricing, all quotations       |
| STAFF   | Create/edit customers and quotations                      |
| VIEWER  | Read-only access to quotations and reports                |

---

## 5. Application Navigation Map

```
Login
  └── Dashboard
        ├── Customers
        │     ├── Customer List (search)
        │     ├── Add Customer
        │     └── Customer Details
        │           └── Customer Quotation History
        │
        ├── Quotations
        │     ├── Quotation List (search + filter by status)
        │     ├── Create Quotation (Quotation Builder)
        │     │     ├── Select Customer
        │     │     ├── Select Pricing Version
        │     │     ├── Select Charge Sections
        │     │     ├── Enter Parameters (kW, type, late fee)
        │     │     ├── Live Calculation Preview
        │     │     └── Save Draft / Finalize
        │     └── Quotation Detail
        │           ├── Charge Breakdown Table
        │           ├── Status Change
        │           ├── Print / PDF
        │           └── Approve / Reject
        │
        ├── Charges Configuration
        │     ├── View Pricing Versions
        │     ├── Upload New JSON Version
        │     ├── Validate & Activate
        │     └── View JSON Preview
        │
        └── Reports
              ├── Quotations by Status
              ├── Total Revenue
              └── Top Customers
```

---

## 6. Database Schema

### Tables

#### `User`
| Column       | Type     | Notes                    |
|--------------|----------|--------------------------|
| id           | String   | cuid, PK                 |
| name         | String   |                          |
| email        | String   | unique                   |
| passwordHash | String   | bcryptjs hashed          |
| role         | UserRole | ADMIN / STAFF / VIEWER   |
| createdAt    | DateTime |                          |
| updatedAt    | DateTime |                          |

#### `Customer`
| Column   | Type   | Notes    |
|----------|--------|----------|
| id       | String | cuid, PK |
| name     | String |          |
| mobile   | String |          |
| email    | String | optional |
| address  | String | optional |
| village  | String | optional |
| city     | String | optional |
| gstNo    | String | optional |
| notes    | String | optional |

#### `PricingVersion`
| Column      | Type    | Notes                          |
|-------------|---------|--------------------------------|
| id          | String  | cuid, PK                       |
| versionName | String  | e.g., "v2026-01"               |
| title       | String  | Human-readable title           |
| jsonData    | Json    | Full pricing rules JSON        |
| isActive    | Boolean | Only one active at a time      |

#### `Quotation`
| Column          | Type           | Notes                          |
|-----------------|----------------|--------------------------------|
| id              | String         | cuid, PK                       |
| quoteNo         | String         | unique, e.g., "QT-2601-1234"   |
| customerId      | String         | FK → Customer                  |
| pricingVersionId| String         | FK → PricingVersion            |
| status          | QuotationStatus| DRAFT/FINAL/APPROVED/REJECTED  |
| subtotal        | Float          |                                |
| extraCharges    | Float          | Sum of manual items            |
| discount        | Float          |                                |
| grandTotal      | Float          |                                |
| notes           | String         | optional                       |
| validUntil      | DateTime       | optional                       |
| createdById     | String         | FK → User                      |

#### `QuotationItem`
| Column         | Type   | Notes                                  |
|----------------|--------|----------------------------------------|
| id             | String | cuid, PK                               |
| quotationId    | String | FK → Quotation (cascade delete)        |
| sectionKey     | String | e.g., "fixed_service_line"             |
| sectionName    | String | Display name (Gujarati + English)      |
| itemLabel      | String | Matched charge label                   |
| calculationType| String | fixed / formula / per_kw               |
| inputData      | Json   | { chargeKey, loadKw, isLate }          |
| baseAmount     | Float  |                                        |
| lateFee        | Float  |                                        |
| total          | Float  | baseAmount + lateFee                   |

#### `ManualItem`
| Column     | Type   | Notes                           |
|------------|--------|---------------------------------|
| id         | String | cuid, PK                        |
| quotationId| String | FK → Quotation (cascade delete) |
| label      | String | e.g., "Site Visit Charge"       |
| amount     | Float  |                                 |

#### `AuditLog`
| Column    | Type   | Notes                     |
|-----------|--------|---------------------------|
| id        | String | cuid, PK                  |
| userId    | String | FK → User                 |
| action    | String | e.g., "CREATE_QUOTATION"  |
| entityType| String | e.g., "Quotation"         |
| entityId  | String |                           |
| oldData   | Json   | optional                  |
| newData   | Json   | optional                  |

---

## 7. Pricing JSON Structure

The system reads a normalized JSON file to calculate all charges.

```json
{
  "title": "ભરવાપાત્ર ચાર્જિસ - Electrical Service Charges",
  "version": "2026-01",
  "sections": [
    {
      "key": "registration_verification",
      "section_name": "રજીસ્ટ્રેશન અને ટેસ્ટ રિપોર્ટ વેરિફિકેશન ચાર્જિસ",
      "description": "Registration and Test Report Verification Charges",
      "input_type": "type_select",
      "charges": [
        {
          "key": "residential_single_phase",
          "label": "રહેણાંક - સિંગલ ફેઝ (Residential Single Phase)",
          "amount_type": "fixed",
          "amount": 50,
          "late_fee": 20
        }
      ]
    },
    {
      "key": "fixed_service_line",
      "section_name": "ફિક્સડ સર્વિસ લાઇન ચાર્જિસ",
      "input_type": "load_kw",
      "charges": [
        {
          "key": "slab_20_100",
          "label": "20.01 - 100 kW",
          "amount_type": "formula",
          "base_amount": 21000,
          "extra_per_kw": 1100,
          "formula_from_kw": 20,
          "min_kw": 20.01,
          "max_kw": 100
        }
      ]
    },
    {
      "key": "security_deposit",
      "section_name": "સિક્યુરિટી ડિપોઝિટ",
      "input_type": "load_kw_type_select",
      "charges": [
        {
          "key": "residential",
          "label": "રહેણાંક (Residential)",
          "amount_type": "per_kw",
          "rate_per_kw": 100
        }
      ]
    }
  ]
}
```

### Supported `input_type` Values
| input_type          | User Input Required              |
|---------------------|----------------------------------|
| `type_select`       | Select charge type from dropdown |
| `load_kw`           | Enter load in kW                 |
| `load_kw_type_select` | Both type AND load kW          |

### Supported `amount_type` Values
| amount_type | Formula                                              |
|-------------|------------------------------------------------------|
| `fixed`     | `amount`                                             |
| `formula`   | `base_amount + (load - formula_from_kw) * extra_per_kw` |
| `per_kw`    | `rate_per_kw × load_kw`                             |

---

## 8. Calculation Engine

**File:** `src/lib/pricing/calculator.ts`

### Core Functions

#### `matchLoadSlab(loadKw, charges)`
Finds the matching charge slab for a given load in kW using `min_kw` and `max_kw` range matching.

#### `calculateChargeAmount(charge, loadKw)`
Computes the amount based on `amount_type`:
- `fixed` → returns `charge.amount`
- `formula` → `base_amount + (loadKw - formula_from_kw) * extra_per_kw`
- `per_kw` → `rate_per_kw * loadKw`

#### `calculateSection(section, input)`
Processes one charge section with user inputs (chargeKey, loadKw, isLate) and returns a `CalculatedItem`.

#### `calculateQuotation(inputs, pricing, manualItems, discount)`
Full quotation engine — processes all selected sections, combines manual items, applies discount, returns `CalculationResult`:

```typescript
{
  items: CalculatedItem[];    // per-section breakdown
  subtotal: number;           // sum of all items
  extraCharges: number;       // sum of manual items
  discount: number;
  grandTotal: number;         // subtotal + extraCharges - discount
}
```

### Calculation Test Results
| Test | Input | Expected | Result |
|------|-------|----------|--------|
| Fixed + late fee | Residential Single Phase, late=true | ₹50 + ₹20 = ₹70 | ✅ ₹70 |
| Load slab match | 7 kW | Slab "5.01-10 kW" | ✅ ₹8,500 |
| Formula 30 kW | 30 kW in 20-100 slab | 21000+(30-20)×1100 | ✅ ₹32,000 |
| Per kW deposit | Residential, 7 kW | 100×7 | ✅ ₹700 |
| Grand total | subtotal+extra-discount | ₹9,270+₹500-₹200 | ✅ ₹9,570 |

---

## 9. API Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/customers` | ✅ | List customers (search, pagination) |
| POST | `/api/customers` | ✅ | Create customer |
| GET | `/api/customers/[id]` | ✅ | Get customer + quotation history |
| PUT | `/api/customers/[id]` | ✅ | Update customer |
| DELETE | `/api/customers/[id]` | ✅ | Delete customer |
| GET | `/api/quotations` | ✅ | List quotations (search, status filter) |
| POST | `/api/quotations` | ✅ | Create quotation with items |
| GET | `/api/quotations/[id]` | ✅ | Get quotation with full detail |
| PATCH | `/api/quotations/[id]` | ✅ | Update quotation status |
| DELETE | `/api/quotations/[id]` | ✅ | Delete quotation |
| GET | `/api/pricing` | ✅ | List pricing versions |
| POST | `/api/pricing` | ✅ | Upload new pricing version |
| GET | `/api/pricing/[id]` | ✅ | Get pricing version with JSON |
| DELETE | `/api/pricing/[id]` | ✅ | Delete pricing version (not if active) |
| POST | `/api/pricing/[id]/activate` | ✅ | Activate a pricing version |
| GET | `/api/auth/[...nextauth]` | — | NextAuth handler |
| POST | `/api/auth/[...nextauth]` | — | NextAuth handler |

All authenticated routes return `401 Unauthorized` without a valid session.

---

## 10. File & Folder Structure

```
quotation-management-system/
├── prisma/
│   ├── schema.prisma          # Prisma v7 schema (7 models)
│   └── seed.ts                # Seed script (tsx-based)
├── prisma.config.ts           # Prisma v7 config (DB URL, migration path)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx     # Sidebar + main layout
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── quotations/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx   ← Quotation Builder
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── pricing/page.tsx
│   │   │   └── reports/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── customers/route.ts
│   │   │   ├── customers/[id]/route.ts
│   │   │   ├── quotations/route.ts
│   │   │   ├── quotations/[id]/route.ts
│   │   │   ├── pricing/route.ts
│   │   │   ├── pricing/[id]/route.ts
│   │   │   └── pricing/[id]/activate/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx           # Redirects to /dashboard
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   └── header.tsx
│   │   ├── providers/
│   │   │   └── session-provider.tsx
│   │   └── ui/
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       └── textarea.tsx
│   ├── data/
│   │   └── pricing/
│   │       └── charges-v1.json  # Default Gujarat electricity board charges
│   ├── generated/
│   │   └── prisma/              # Auto-generated by `prisma generate`
│   ├── lib/
│   │   ├── auth.ts              # NextAuth v4 authOptions + auth() helper
│   │   ├── db/prisma.ts         # Prisma singleton with PrismaPg adapter
│   │   ├── pricing/
│   │   │   └── calculator.ts    # Core calculation engine
│   │   └── utils.ts             # cn(), formatCurrency(), generateQuoteNumber()
│   ├── proxy.ts                 # Route protection middleware (Next.js 16)
│   └── types/
│       ├── index.ts             # App TypeScript types
│       └── next-auth.d.ts       # NextAuth session type extensions
├── .env                         # DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
├── package.json
├── prisma.config.ts
├── tsconfig.json
├── tsconfig.seed.json
├── SETUP.md
└── PRD.md                       # This file
```

---

## 11. Key Technical Decisions & Breaking Changes Handled

### Prisma v7 (Breaking Changes)
- Generator changed from `prisma-client-js` → `prisma-client`
- DB URL moved from `schema.prisma` → `prisma.config.ts`
- Generated client output: `src/generated/prisma/` (import from `@/generated/prisma/client`)
- PrismaClient requires a driver adapter: `new PrismaPg({ connectionString })`
- Seed script uses `tsx` (not `ts-node`) because generated client uses ESM

### Next.js 16 (Breaking Changes)
- `middleware.ts` renamed to `proxy.ts` (deprecation warning fixed)
- Route types: static `○` vs dynamic `ƒ`

### NextAuth v4 (Not v5)
- Uses `authOptions` object pattern
- Session access in server components: `getServerSession(authOptions)`
- `auth()` is a local wrapper around `getServerSession`
- JWT strategy (no database session table needed)
- Type extensions in `src/types/next-auth.d.ts` for `id` and `role`

### Zod v4 (Breaking Change)
- `z.record()` requires 2 arguments: `z.record(z.string(), z.unknown())`

---

## 12. Default Pricing Data (Gujarat Electricity Board)

### Section 1: Registration & Verification Charges (`type_select`)
| Type | Amount | Late Fee |
|------|--------|----------|
| Residential Single Phase | ₹50 | ₹20 |
| Residential Three Phase | ₹120 | ₹100 |
| Commercial Single Phase | ₹120 | ₹50 |
| Commercial Three Phase | ₹240 | ₹100 |
| Industrial | ₹360 | ₹150 |

### Section 2: Fixed Service Line Charges (`load_kw`)
| Slab | Amount / Formula |
|------|-----------------|
| 0 – 2 kW | ₹3,400 |
| 2.01 – 5 kW | ₹5,400 |
| 5.01 – 10 kW | ₹8,500 |
| 10.01 – 20 kW | ₹14,000 |
| 20.01 – 100 kW | ₹21,000 + ₹1,100 per kW above 20 |
| Above 100 kW | ₹1,09,000 + ₹1,200 per kW above 100 |

### Section 3: Service Line Shifting Charges (`load_kw`)
| Slab | Amount / Formula |
|------|-----------------|
| 0 – 2 kW | ₹2,500 |
| 2.01 – 5 kW | ₹4,000 |
| 5.01 – 10 kW | ₹6,500 |
| 10.01 – 20 kW | ₹11,000 |
| Above 20 kW | ₹15,000 + ₹800 per kW above 20 |

### Section 4: Security Deposit (`load_kw_type_select`)
| Category | Rate |
|----------|------|
| Residential | ₹100 per kW |
| Non-Residential (≤15 kW) | ₹1,200 per kW |
| Non-Residential (>15 kW) | ₹1,500 per kW |
| Industrial | ₹3,400 per kW |

---

## 13. Build & Test Results

### Production Build
```
✓ Compiled successfully in 2.5s
✓ TypeScript: No errors
✓ 20 routes generated (10 static, 10 dynamic)
✓ No deprecation warnings
```

### Route Map
| Route | Type |
|-------|------|
| `/` | Static (redirects to /dashboard) |
| `/login` | Static |
| `/customers` | Static (client-side data fetch) |
| `/customers/new` | Static |
| `/quotations` | Static (client-side data fetch) |
| `/quotations/new` | Static (Quotation Builder) |
| `/pricing` | Static |
| `/dashboard` | Dynamic (server-side DB queries) |
| `/customers/[id]` | Dynamic |
| `/quotations/[id]` | Dynamic |
| `/reports` | Dynamic |

### Security Tests
| Test | Result |
|------|--------|
| Unauthenticated `/dashboard` | ✅ 307 → `/login` |
| Unauthenticated `/api/customers` | ✅ 401 Unauthorized |
| Unauthenticated `/api/quotations` | ✅ 401 Unauthorized |
| Unauthenticated `/api/pricing` | ✅ 401 Unauthorized |

### Database Tests
| Test | Result |
|------|--------|
| All 7 tables created | ✅ |
| Seed: 2 users created | ✅ |
| Seed: Pricing version active | ✅ |
| Seed: Sample quotation | ✅ QT-2601-1001, ₹9,050 |
| Customer CRUD | ✅ |
| Quotation with items | ✅ |

---

## 14. Environment Configuration

```env
# .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/quotation_mgmt?schema=public"
NEXTAUTH_SECRET="your-super-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

```typescript
// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

---

## 15. Setup Commands (Quick Reference)

```bash
# 1. Install dependencies
npm install

# 2. Setup database (first time)
npx prisma db push

# 3. Seed data
npm run db:seed

# 4. Start development
npm run dev

# 5. Production build
npm run build

# Other useful commands
npm run db:generate     # Regenerate Prisma client after schema changes
npm run db:studio       # Open Prisma Studio (visual DB browser)
npx prisma migrate dev  # Run schema migrations
```

---

## 16. Quotation Status Workflow

```
CREATE
  └── DRAFT
        └── FINAL
              ├── APPROVED  ✅
              └── REJECTED  ❌
```

- **DRAFT** — Work in progress, can be edited
- **FINAL** — Ready for review, locked for editing
- **APPROVED** — Approved by admin
- **REJECTED** — Rejected with reason

---

## 17. Future Enhancements (Phase 2 & 3)

### Phase 2
- [ ] Duplicate quotation
- [ ] WhatsApp share format
- [ ] Price version history comparison
- [ ] Edit existing quotation
- [ ] Customer-wise revenue report
- [ ] Monthly trend charts (Recharts already installed)
- [ ] Search in Reports page

### Phase 3
- [ ] Invoice generation from approved quotation
- [ ] Work order generation
- [ ] Approval workflow with email notification
- [ ] Multi-language support (Gujarati + English toggle)
- [ ] Mobile-responsive improvements
- [ ] Role-based feature flags
- [ ] Export reports to Excel/CSV
- [ ] Bulk quotation operations

---

## 18. Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Staff | staff@example.com | staff123 |

---

*PRD generated from development chat — April 2026*



PRD.md created — 621 lines covering the full project.

Here's what's documented inside:

Section	Content
1–3	Overview, problem statement, system architecture diagram
4–5	User roles (Admin/Staff/Viewer), full navigation map
6	Complete database schema — all 7 tables with column types
7–8	Pricing JSON structure + calculation engine (functions, formulas, test results)
9	All 17 API routes with method, auth, and description
10	Full folder/file structure with descriptions
11	Key technical decisions — Prisma v7, Next.js 16, NextAuth v4, Zod v4 breaking changes
12	Default Gujarat electricity board pricing data (all 4 sections)
13	Build results, route map, security tests, database tests
14–15	Environment config and setup commands
16	Quotation status workflow (Draft → Final → Approved/Rejected)
17	Phase 2 & 3 future enhancements
18	Demo credentials
