# DATA MODEL

> **Status:** Conceptual shared model for Phase 0. No migrations exist yet. This defines *entities and relationships*, not final column types. The concrete schema + migrations land in Phase 1 (`packages/database`).

## Design stance

OBSIDIAN is built around **structured business data**, not conversation history. The AI reads and writes these entities through tools; it does not answer from memory alone. Every business record carries an `organization_id` for tenant isolation (see `SECURITY.md`).

## Core shared entities

These live in `packages/database` and are shared across all verticals.

| Entity | Purpose | Key relationships |
|---|---|---|
| **User** | An individual login | belongs to many Organizations via Membership |
| **Organization** | A business/tenant account | has many Users (via Membership), owns all business records |
| **Membership** | A user's role in an organization | User × Organization, with `role` |
| **Customer** | A person the business serves | belongs to Organization; has Bookings, Transactions, Messages |
| **Lead** | A prospective customer | belongs to Organization; may convert to Customer |
| **Booking** | A scheduled engagement | Organization, Customer, Service; may produce a Trip/Appointment |
| **Trip** | A completed unit of work (RIDES-style) | Booking, Customer, Vehicle, Employee/driver |
| **Appointment** | A completed unit of work (BEAUTY-style) | Booking, Customer, Service, Employee |
| **Service** | A thing the business sells | Organization; referenced by Bookings/Trips/Appointments |
| **Transaction** | Money in or out | Organization; typed as Revenue or Expense; links to Trip/Appointment/Vehicle |
| **Revenue** | Income record (a Transaction subtype/view) | derived from completed work |
| **Expense** | Cost record (a Transaction subtype/view) | e.g. fuel, tolls, product cost |
| **Vehicle** | An asset used to deliver work | Organization; used by Trips |
| **Employee** | A worker/driver/tech | Organization; may map to a User via Membership |
| **Message** | A communication with a customer | Organization, Customer; direction + channel |
| **Task** | A to-do for the business/owner | Organization; optional Customer link |
| **Note** | Free-text context | Organization; optional entity link; candidate for vector search |
| **Document** | A stored file/artifact | Organization; optional entity link |
| **Alert** | A triggered notification | Organization; from an event/rule |
| **AIInsight** | A generated proactive insight | Organization; from analytics/insight rules |
| **Event** | A durable business event | Organization; the event-history log |
| **AuditLog** | Who did what, when | Organization, User; every Level 3–4 action |

### Roles (on Membership)

`Owner`, `Admin`, `Manager`, `Employee`, `Driver`. Roles map to permission capabilities and, combined with permission levels 1–4, gate AI actions.

### Revenue / Expense modeling note

`Revenue` and `Expense` are best modeled as one **Transaction** table with a `type` (and a `category` for expenses like `fuel`, `tolls`, `product`), rather than two divergent tables. This keeps money math (net, margin, per-mile, per-hour) uniform across verticals. Decision recorded in `DECISIONS.md` (ADR-004).

## Relationship sketch

```
Organization 1───∞ Membership ∞───1 User
Organization 1───∞ Customer 1───∞ Booking 1───0..1 Trip / Appointment
Organization 1───∞ Service
Organization 1───∞ Transaction (Revenue | Expense)   ─ links → Trip/Appointment/Vehicle
Organization 1───∞ Vehicle / Employee
Organization 1───∞ Message / Task / Note / Document / Alert / AIInsight / Event / AuditLog
```

## Vertical extensions

Each vertical **extends** the shared model with its own tables/columns rather than bloating the core. A vertical row typically hangs off `Trip`/`Appointment`/`Booking` and always carries `organization_id`.

### OBSIDIAN RIDES (Trip extension)

Pickup location, drop-off location, mileage, hours, hourly rate, toll expense, gas expense, driver, vehicle, trip revenue, estimated profit.

Worked example — spoken input:
> "July 24th. Brooklyn to JFK. Customer Ashley. Charged $240. Spent $18 on gas and $12 on tolls."

Structured result:
```
Customer:      Ashley
Pickup:        Brooklyn
Destination:   JFK
Revenue:       $240
Gas:           $18
Tolls:         $12
Est. profit:   $210   (240 − 18 − 12)
```
Derived RIDES metrics: revenue per mile, revenue per hour, vehicle profitability, trip profitability, customer lifetime value, repeat-customer/booking frequency, expense trends, monthly performance, driver performance.

### OBSIDIAN BEAUTY (Appointment extension)

Service type, appointment duration, product cost, customer rebooking cycle, tips, service revenue. Derived: service profitability, retention, rebooking-due detection.

### OBSIDIAN TOWING (future — Job/Call extension)

Pickup, destination, vehicle information, tow type, driver, dispatch status, ETA, call transcript. **Not implemented in this repo** — the standalone Towing system proves its MVP first, then integrates (see `VERTICALS.md`).

## Derived / computed values (not stored raw)

Estimated profit, margins, per-mile and per-hour figures, lifetime value, retention windows, and trend deltas are **computed by `packages/analytics`** from the base records. Storing them is a caching decision made later, not a source of truth.

## Data integrity principles

Every business row has `organization_id` (enforced by RLS). Money is stored in a precise type (integer minor units or `numeric`), never floats. Timestamps are stored in UTC. Soft-delete is preferred over hard-delete for auditability; true deletion is a Level-4 action. Foreign keys enforce the relationships above.
