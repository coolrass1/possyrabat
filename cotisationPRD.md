# Product Requirements Document (PRD)
## Target-Based Quarterly Contributions (Cotisations) Module

**Version:** 1.0  
**Status:** Approved / Draft  
**Objective:** Implement a target-driven contributions (cotisations) tracking system centered around a €3,600,000 global target spanning July 1, 2026, to December 31, 2027 (6 quarters / 18 months).

---

## 1. Core Objectives & Scope

The association requires a structured way to manage a large capital target. This module will allow:
- **Admins (Committee/Owners)** to configure manual targets (global, quarterly, and monthly), set quarterly member obligations, and log payments attributed to specific quarters.
- **Members** to see overall progress, current quarterly progress, and their individual payment standings.

---

## 2. Key Concepts & Business Logic

### A. Targets Hierarchy
1. **Global Target:** Pre-set to €3,600,000 for the period July 1, 2026 – December 31, 2027.
2. **Quarterly Targets:** Manually configured by the admin (e.g., €600,000 for Q3 2026).
3. **Monthly Targets:** Manually configured by the admin for each month in a quarter (e.g., Q3 2026 has July, August, September targets).

### B. Member Obligations
- The admin manually inputs the exact amount each member is required to contribute for a specific quarter. 
- *Note:* While members' obligations are conceptually related to their parcel holdings, the admin will calculate and input these values manually for simplicity in the initial phase.

### C. Payment Allocation
- Payments are logged offline by the admin.
- Each payment must be attributed to a **specific quarter** (e.g., Q3 2026).
- A payment can optionally be earmarked for a **specific month** of that quarter.

---

## 3. Data Model (SQLite Schema)

We will add the following tables to `data.db`:

```sql
-- Represents quarterly targets set by admin
CREATE TABLE IF NOT EXISTS target_quarters (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL, -- e.g., 'Q3 2026', 'Q4 2026'
  start_date INTEGER NOT NULL, -- Unix timestamp
  end_date INTEGER NOT NULL, -- Unix timestamp
  target_amount REAL NOT NULL,
  created_at INTEGER NOT NULL
);

-- Represents monthly targets set by admin within a quarter
CREATE TABLE IF NOT EXISTS target_months (
  id TEXT PRIMARY KEY,
  quarter_id TEXT NOT NULL,
  name TEXT NOT NULL, -- e.g., 'July 2026', 'August 2026'
  target_amount REAL NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (quarter_id) REFERENCES target_quarters(id)
);

-- Represents manual quarterly obligations assigned to members
CREATE TABLE IF NOT EXISTS member_quarter_obligations (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  quarter_id TEXT NOT NULL,
  amount_due REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (quarter_id) REFERENCES target_quarters(id),
  UNIQUE(member_id, quarter_id)
);

-- Represents payments recorded towards a specific target quarter
CREATE TABLE IF NOT EXISTS target_payments (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  quarter_id TEXT NOT NULL,
  month_id TEXT, -- Optional earmark
  amount REAL NOT NULL,
  date_paid INTEGER NOT NULL,
  method TEXT NOT NULL, -- 'cash', 'bank_transfer', etc.
  notes TEXT,
  recorded_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (quarter_id) REFERENCES target_quarters(id),
  FOREIGN KEY (month_id) REFERENCES target_months(id),
  FOREIGN KEY (recorded_by) REFERENCES members(id)
);
```

---

## 4. API Endpoints

### Admin & Member Shared
- `GET /api/targets/overview`  
  Returns global progress (total raised vs €3,600,000 target) and active quarter progress.
- `GET /api/targets/my-standing`  
  Returns the logged-in member's obligations and payments history grouped by quarter and month.

### Admin Only (Committee/Owner)
- `POST /api/targets/quarters`  
  Create or update a quarterly target.
- `POST /api/targets/months`  
  Create or update a monthly target.
- `POST /api/targets/obligations`  
  Bulk set or update member quarterly obligations.
- `POST /api/targets/payments`  
  Record a member payment against a quarter (and optional month).

---

## 5. UI/UX Interface Design

### A. Member View (Dashboard Addition)
- **Progress Widgets:**
  - Global progress bar: **€[Raised] raised of €3,600,000** (percent completed).
  - Active Quarter progress bar: **€[Raised] raised of €[Target]** for Q3 2026.
- **My Standing Cards:**
  - Display the member's obligation for the current quarter.
  - Show how much they have paid, their remaining balance, and a breakdown of payments by month.

### B. Admin View (Control Panel Addition)
- **Targets Manager:** Forms to define the targets for the 6 quarters and their corresponding months.
- **Obligations Grid:** A table list of members where the admin can input/edit their quarterly dues.
- **Payment Logger:** A form to record payments:
  - Select member.
  - Select target quarter.
  - Select optional earmarked month.
  - Input amount, date, and method.

---

## 6. Implementation Notes & Open Decisions
1. **Default Obligation Calculation:** Obligation defaults to a manual input per member per quarter. To assist the admin, we will display their parcel count alongside a helper text indicating their proportional standard fee (`parcel_count * per_parcel_fee`).
2. **Date Validation:** Timestamps will default to Unix milliseconds, aligned with existing database conventions.
