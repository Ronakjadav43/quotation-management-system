# Quotation Management System — Setup Guide

## Tech Stack
- **Frontend + Backend**: Next.js 16 (App Router)
- **Database**: PostgreSQL
- **ORM**: Prisma v7 with `@prisma/adapter-pg`
- **Auth**: NextAuth v4 (JWT strategy)
- **UI**: Tailwind CSS v4 + Radix UI primitives
- **Validation**: Zod v4

---

## Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud)

---

## 1. Configure Database

Edit `.env` with your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/quotation_mgmt?schema=public"
NEXTAUTH_SECRET="change-this-to-a-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

Also update `prisma.config.ts`:

```ts
datasource: {
  url: process.env["DATABASE_URL"],
},
```

---

## 2. Run Migrations

```bash
# Push schema to database (first time)
npx prisma migrate dev --name init

# OR just push without migration history
npx prisma db push
```

---

## 3. Seed the Database

```bash
npm run db:seed
```

This creates:
- Admin user: `admin@example.com` / `admin123`
- Staff user: `staff@example.com` / `staff123`
- Default Gujarat electricity board pricing rules (v2026-01)
- One sample customer and quotation

---

## 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

---

## Application Modules

### Dashboard
- Summary stats: total customers, quotations by status, revenue
- Recent quotations list

### Customers
- List all customers with search
- Add / view customer details
- See customer quotation history

### Quotations
- List all quotations with search + status filter
- Create new quotation (Quotation Builder)
- View quotation detail with charge breakdown
- Print / export to PDF via browser print
- Change status (Draft → Final → Approved/Rejected)

### Quotation Builder (Key Feature)
- Select customer and pricing version
- Choose applicable charge sections:
  - Registration & Verification
  - Fixed Service Line
  - Service Line Shifting
  - Security Deposit
- Enter load (kW) and type per section
- Toggle late fee per section
- Add extra/manual charges
- Apply discount
- Live calculation preview
- Save as Draft or Finalize

### Charges Configuration
- Upload new pricing JSON versions
- Load default Gujarat electricity board charges
- Activate a pricing version
- View JSON of any version

### Reports
- Quotations by status (count + value)
- Total finalized revenue
- Top customers

---

## Pricing JSON Structure

```json
{
  "title": "...",
  "version": "2026-01",
  "sections": [
    {
      "key": "registration_verification",
      "section_name": "...",
      "input_type": "type_select",
      "charges": [
        {
          "key": "residential_single_phase",
          "label": "...",
          "amount_type": "fixed",
          "amount": 50,
          "late_fee": 20
        }
      ]
    },
    {
      "key": "fixed_service_line",
      "input_type": "load_kw",
      "charges": [
        {
          "key": "slab_20_100",
          "amount_type": "formula",
          "base_amount": 21000,
          "extra_per_kw": 1100,
          "formula_from_kw": 20,
          "min_kw": 20.01,
          "max_kw": 100
        }
      ]
    }
  ]
}
```

**Supported `amount_type` values:**
- `fixed` — flat amount
- `formula` — `base_amount + (load - formula_from_kw) * extra_per_kw`
- `per_kw` — `rate_per_kw * load`

---

## Database Scripts

```bash
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:migrate    # Run migrations
npm run db:push       # Push schema without migrations
npm run db:seed       # Seed initial data
npm run db:studio     # Open Prisma Studio (visual DB browser)
```
