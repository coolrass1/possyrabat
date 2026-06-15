# Possyrabat — Product Requirements Document
**Version:** 5.2 (consolidated, build-ready)
**Type:** Web application — the shared home of a land-owning member association
**Core principle:** *One place where members see everything — their parcels, the money and where it goes, the case, and each other — in a warm, living interface.*

---

## 1. Overview

A web platform for a member association (friends and nuns) who **own land together** and maintain a **shared fund**. The group is currently **in court to recover parcels taken by occupiers**. The platform is the group's single shared home and exists to make everything **visible and alive**, so no member ever has to ask "where do things stand?"

It does five things:

1. **Finance** — the ongoing shared fund: contributions in, spending out across three aims, live balance.
2. **Land & Shares** — the survey map of the whole estate and each member's fixed parcel holding.
3. **The Court Case** — the dispute to recover the land: where it stands, what the court said, what the lawyer advised, what's next.
4. **Meetings** — records of weekly/monthly meetings: attendance, decisions, actions.
5. **Community** — keeping the group informed and communicating together.

No money moves through the system and no legal action happens inside it; it **mirrors** the real world.

### Confirmed decisions
| Item | Decision |
|---|---|
| What the group shares | Jointly owned land + an ongoing shared fund |
| Land display | **A single uploaded survey map of the whole estate** (no per-parcel coordinates) |
| Land unit | **Square metres (m²)** |
| Member holdings | **Each member owns a fixed number of parcels** (e.g. 2, 4, 6) — permanent, not member-editable |
| Current situation | In court against occupiers who took parcels |
| Fund model | Ongoing — spent and refilled |
| Fund purpose (3 aims) | **Court case · Construction/development · Site security** |
| Earmarking | **None — one pooled fund**; spending decided as the group goes |
| Expense approvals | **None** — the committee records spending directly (no approval step) |
| Contribution basis | **Mandatory — proportional to parcels held** (parcels × a per-parcel fee) |
| Per-parcel fee | An amount the group will set; obligation = parcel count × fee |
| Contribution visibility | Fully transparent — members see each other's contributions |
| Case documents | **Visible to all members** — everyone has equal right to know |
| Currency | Euro (€) |
| Members | 15–40 |
| Maintainers | Committee of 2–4 (admins) |
| Payments | Offline only — recorded manually by the committee |
| Traffic | Low (≈5–10 visits/day) — no heavy architecture needed |
| Email | Required — notifications, statements, case & meeting updates |
| Front-end priority | **Rich, warm, lively** — members instantly see what's going on |

---

## 2. The Five Pillars

| Pillar | Answers | Default visibility |
|---|---|---|
| **Finance** | "Is the money real, and where does it go (case / building / security)?" | All members |
| **Land & Shares** | "Here's our map — and how many parcels are mine." | All members |
| **The Court Case** | "Where do we stand, what did the court/lawyer say, what's next?" | All members (sensitive docs restrictable) |
| **Meetings** | "What did we decide, and who's doing what?" | All members |
| **Community** | "What are we doing, and how do we talk?" | All members |

The **home screen** surfaces all five at a glance: the estate map, the live fund balance with its three-way split, the case status with next-hearing countdown, the member's own parcels, this month's contributions, and a live activity feed.

---

## 3. Roles & Permissions

| Capability | Member | Committee (Admin) |
|---|:--:|:--:|
| View map, all members' parcel counts | ✅ | ✅ |
| View fund balance, spending split, custodian | ✅ | ✅ |
| View contributions (open roster) | ✅ | ✅ |
| View expense ledger + receipts | ✅ | ✅ |
| View case status, court/lawyer updates, timeline | ✅ | ✅ |
| View all case documents | ✅ | ✅ |
| View meeting minutes, decisions, actions | ✅ | ✅ |
| View community feed, events, polls, notices | ✅ | ✅ |
| Respond to events/polls; edit own profile | ✅ | ✅ |
| Record/edit contributions & expenses | ❌ | ✅ |
| Upload/replace the map; set member parcel counts | ❌ | ✅ |
| Update the case, log steps, set doc visibility | ❌ | ✅ |
| Create meetings, write minutes, assign actions | ❌ | ✅ |
| Manage campaigns, stories, events, polls, notices | ❌ | ✅ |
| Add/remove members, assign roles | ❌ | ✅ (owner) |
| Broadcast email; view audit log | ❌ | ✅ |

> **Owner** = one committee member who can manage members/roles (prevents lock-out).

---

## 4. Modules

### A — Land & Shares *(simplified)*
- **The estate map:** a single image the committee uploads, shown to everyone as the centerpiece. The map carries the detail; the app does **not** store per-parcel coordinates or locations.
- **Holdings overview:** total parcels, total members, and a simple list of **each member's parcel count** (fixed).
- **My parcels:** the member sees their own count — "You hold 4 parcels" — with sizes shown in **square metres (m²)**, and if the committee marks any as caught up in the case, which ones are **secure** vs. **under the case**.
- Parcel counts are **permanent**; only the committee can change them (rare).

### B — The Court Case
- **Case header:** title, opposing party, court/authority, current stage (**filed → in progress → hearing scheduled → awaiting ruling → ruling given → appeal → resolved → closed**), plain-language summary, next hearing date.
- **Case timeline (full history):** chronological log of every development — each entry has date, description, type (**court ruling · lawyer advice · hearing · filing · group decision · other**), who logged it, optional document. This is the heart of the module.
- **Next hearing countdown** surfaced on the home screen.
- **What we must do next:** action items (task, who, by when).
- **Lawyer details** (committee-managed).
- **Case documents:** court papers, lawyer letters, evidence — **all visible to every member** (the group shares equal right to know).
- **Case costs:** legal spending pulled from the ledger.

### C — Fund Truth & Allocation
- **Balance hero** (€), animated.
- **Reconciliation:** Total In − Total Out = Balance (always adds up; balance is derived, never an editable number).
- **Three-way allocation:** a donut + totals showing spending across **Court case · Construction · Security**.
- **Custodian panel:** where funds are held (bank, masked account), last reconciled date.

> No approval step: the committee records spending directly. (An approval workflow can be added later if the group ever wants it.)

### D — Contributions + Open Roster
- **The obligation:** every member's expected contribution is **parcels × per-parcel fee** — mandatory, because the money is invested in the land. A member with more parcels owes more.
- **My standing:** the member sees their obligation, what they've paid, and the balance — "For your 4 parcels you owe €X; paid €Y; **up to date / behind by €Z**." Clear and factual.
- **My contributions:** each payment — date, amount, period covered, method, recorded by whom.
- **Open roster:** all members — name, parcels held, amount due, amount paid, and status (up to date / behind). A fair accountability view: everyone's obligation is set by the same rule, so the roster is honest, not arbitrary.
- **Arrears:** the system tracks who is behind and by how much, for the committee to follow up.

### E — Spending Ledger
- Itemized expenses with **aim** (Court case / Construction / Security / General), amount, receipt image, recorded by, approved by.
- Spending-by-aim chart; budget vs. actual; outstanding commitments.

### F — Campaigns *(optional)*
- Time-bound funding pushes tied to an aim — e.g. "€3,000 for legal fees," "€5,000 for fencing."

### G — Meetings & Minutes
- Record: title & type (weekly/monthly/AGM/special), date/time/location, attendees & apologies, agenda, minutes.
- **Decisions** listed; **action items** (task, assignee, due date, status) that can surface on home screens.
- Actions/decisions can link to the case, a member, or an expense. Searchable archive; latest pinned on home.

### H — Community Life
- Story feed with photos; events + RSVP; noticeboard; polls/decisions; gratitude wall.
- Optional **intentions/dedications space** (on/off), suited to the group's character.

### I — Records & Protection
- **Audit log:** every financial entry and case/parcel change — what, who, when, before/after. Committee-visible.
- **Monthly statement:** auto-generated (in, out by aim, balance, who contributed), emailed + downloadable.
- **Rules / member agreement**, **roles page**, **year-end report**.

### J — Authentication & Profiles
- Member login (email + password), reset; committee accounts flagged; profile (name, photo?, email, phone?, join date, role).

### K — Email & Notifications
- Configurable triggers: **case update · hearing reminder · contribution recorded · new meeting minutes · new story/event · monthly statement**.
- Manual broadcast; email log for transparency.

---

## 5. Pages / Routes

| Route | Role | Purpose |
|---|---|---|
| `/login`, `/reset-password` | All | Authentication |
| `/` (home) | Member | Snapshot of all five pillars |
| `/land` | Member | The map + holdings + my parcels |
| `/case` | Member | Status, timeline, hearings, documents |
| `/contributions` | Member | My history + open roster |
| `/spending` | Member | Expense ledger by aim + receipts |
| `/campaigns` | Member | Funding pushes |
| `/meetings` | Member | Minutes, decisions, actions |
| `/community` | Member | Stories, events, polls, notices |
| `/statements` | Member | Monthly statements |
| `/rules` | Member | Rules & roles |
| `/profile` | Member | Edit own info |
| `/admin/*` | Committee | Land, case, contributions, spending, meetings, community, members, email, audit, reports |

---

## 6. Data Model

```
Member       (id, name, email, phone?, photo_url?, join_date,
              role[member|committee|owner], parcel_count, status[active|inactive|supported])

EstateMap    (id, image_url, caption, uploaded_by, uploaded_at)   ← single current map

Case         (id, title, opposing_party, court, stage, summary,
              lawyer_name?, lawyer_contact?, opened_date, next_hearing_date?, updated_at)
CaseStep     (id, case_id, date, description,
              type[court_ruling|lawyer_advice|hearing|filing|group_decision|other],
              document_url?, logged_by, created_at)
CaseAction   (id, case_id, task, assigned_to, due_date, status[open|done])

Contribution (id, member_id, amount(EUR), month_covered, date_received,
              method[cash|transfer|cheque|other], notes, recorded_by, timestamps)
Expense      (id, description, amount(EUR), aim[court_case|construction|security|general],
              date, receipt_url?, campaign_id?, recorded_by, status[recorded|paid], timestamps)
Campaign     (id, name, purpose, aim, target_amount(EUR), deadline, status)

Meeting      (id, title, type, date_time, location, attendees[], apologies[],
              agenda, minutes, created_by)
MeetingDecision (id, meeting_id, text)
MeetingAction   (id, meeting_id, task, assigned_to, due_date, status, links_to?)

StoryPost / Event / Poll / Notice
EmailLog     (id, recipients, subject, trigger, sent_at, status)
AuditEntry   (id, entity_type, entity_id, action, before, after, performed_by, timestamp)
Settings     (currency=EUR, size_unit=m², per_parcel_fee, contribution_frequency,
              aims, custodian_name, account_masked,
              last_reconciled_date, rules_text, feature_flags)
```

> **Derived, never stored as editable numbers:** fund balance = SUM(contributions) − SUM(paid expenses); spending-by-aim = SUM(expenses) grouped by aim; each member's obligation = parcel_count × per_parcel_fee, and arrears = obligation-to-date − paid. This guarantees the books always reconcile.

---

## 7. Tech Stack *(deliberately lightweight)*

- **Framework:** Next.js (App Router) — full-stack; Server Actions/Route Handlers for the backend. **No separate backend service.**
- **Database:** PostgreSQL (managed, e.g. Neon/Supabase) — or SQLite for the smallest footprint given low traffic.
- **Auth:** Auth.js v5 (session-based).
- **Email:** Resend.
- **File storage:** S3-compatible bucket (map image, receipts, case documents, photos).
- **Hosting:** Vercel.
- **Charts/visuals:** lightweight, mostly hand-built SVG/CSS (no heavy charting dependency required).

At ≈5–10 visits/day this runs comfortably on free/low-cost tiers.

---

## 8. Front-End Design Language

The interface is grounded in the group's world — **land, deeds, growth, and a shared cause** — not a generic admin panel.

- **Palette:** deep botanical green canvas (`#16291F`), warm parchment cards (`#F3ECDD`), brass for money/value (`#C79A45`), clay-red for the case and disputed land (`#B5532E`), moss-green for secure/positive (`#7C9A5E`).
- **Type:** *Fraunces* (warm characterful serif) for display, *Inter* for body, a mono face (*Spline Sans Mono*) for figures so numbers feel precise and live.
- **The map is the hero** — the estate is the reason the group exists, so it opens the home screen.
- **Liveliness through substance:** animated count-up on the fund balance, a filling progress bar for the month, a pulsing next-hearing countdown, disputed-parcel markers that gently throb, and a time-stamped activity feed — energy from real information, not gimmicks.
- **Tone:** warm, dignified, calm; rosters and holdings read as fair and factual, never accusatory.
- **Quality floor:** mobile-first, keyboard focus visible, reduced-motion respected.

*(A working preview of the member home screen exists as `association-dashboard-prototype.html`.)*

---

## 9. Phased Roadmap

**Phase 1 — Foundation (Land, Case & Money):** auth & roles · estate map + member parcel counts · the court case (status, timeline, hearings, documents, actions) · fund truth & three-way allocation · contributions + open roster · spending ledger by aim · audit log · monthly email statement.

**Phase 2 — Governance & Communication:** meetings & minutes · email notifications (case updates, hearing reminders, statements) · full home-screen snapshot · campaigns.

**Phase 3 — Community & Maturity:** story feed + photos · events + RSVP · polls · gratitude wall · intentions space · committee analytics · year-end report.

| Phase | Estimate (one developer) |
|---|---|
| Phase 1 | ~4–5 weeks |
| Phase 2 | ~3 weeks |
| Phase 3 | ~3 weeks |

---

## 10. Open Decisions

All resolved:

1. **Land unit** — square metres (m²). ✅
2. **Case document visibility** — all documents visible to every member. ✅
3. **Expense approvals** — none; committee records spending directly. ✅
4. **Earmarking** — none; one pooled fund, spending decided as the group goes. ✅
5. **Supported status** — not included; contributing is mandatory, so the roster stays open and equal. ✅

The only value to set before launch is the **per-parcel fee** (the amount each parcel obliges a member to pay). Nothing blocks the build.

---

## 11. Next Steps
1. Confirm this PRD reads correctly.
2. Begin Phase 1: the data layer + the home, land, case, and money screens, building on the existing design language.
