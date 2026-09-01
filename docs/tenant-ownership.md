# Tenant ownership

Which records belong to a clinic, which belong to a person, and which belong to
the platform. Decided in Phase 2; every new model must answer this before it
ships.

## The three kinds

| Kind | Meaning | Enforcement |
| --- | --- | --- |
| **Tenant-owned** | Belongs to one clinic. Another clinic must never see it. | `organizationId` + a `TenantScope`-typed query |
| **User-owned** | Belongs to one person, wherever they are. | `userId` |
| **Global** | Belongs to the platform. | no tenant column |

Multi-tenancy means correct ownership, not maximum tenant columns. A tenant id
on a global model is not extra safety; it is a second, wrong answer to "whose is
this".

## Bookings are tenant-owned

`Booking.organizationId` records the clinic whose environment a consultation was
booked in. **Null is a real state, not missing data** — a booking made on the
platform belongs to no clinic.

The expert stays global. One expert serves many clinics, so `ExpertProfile` has
no tenant column; tenancy is recorded on the booking.

New bookings are stamped from `getTenantOrganizationIdSafe()`, the same helper
the scan write paths use, so a booking and a scan taken in the same request
agree on which tenant they are in.

### The two existing bookings were deliberately left null

Both were created on **18 August**. The patient's `ClinicPatient` link to
Wellderm was created on **24 August**, six days later. At booking time that
account was a platform user, so attributing those bookings to Wellderm would
assert a relationship that did not exist. They are platform bookings, and null
is the accurate answer.

Worth recording because the obvious backfill — "this patient belongs to
Wellderm, so their bookings do too" — would have been wrong, and only the
timestamps showed it.

## Payments are not one thing

`Payment` looked like a candidate for a tenant column. It is not, because it is
not a general payments table: `packId`, `tier` and `scanCount` mean every row is
a scan-pack purchase. All 7 existing rows have a `packId`; there are no
exceptions to classify.

The other payment types live in their own tables, and each already carries the
right ownership:

| Payment type | Where it lives | Owner |
| --- | --- | --- |
| Scan pack purchase | `Payment` | **User** — credits follow the person, not the clinic |
| Expert consultation | `Booking` (`amountCents`, `paymentRef`, `paidAt`) | **Tenant**, via `Booking.organizationId` |
| Clinic subscription | Stripe, keyed by `ClinicSettings.stripeSubscriptionId` | **Tenant**, by construction |
| Affiliate payout | `AffiliatePayout` | **Platform** — a programme-wide obligation |

So `Payment` gains no `organizationId`. Adding a nullable column that is null on
every row would be exactly the "null as a substitute for missing data" the
design rules out, and would imply a tenant dimension the model does not have.

Tenant-attributed and global payments remain distinguishable because they are in
different tables, not because of a flag.

## Scan credits stay user-owned

`ScanBalance` and `ScanLedger` are keyed by `userId` only. The current model is
a person holding credits, not a clinic funding a shared wallet. If clinic-funded
credits are introduced later, that is a new capability with its own model — not
a column added here.

## The inventory

| Model | Ownership | Tenant field |
| --- | --- | --- |
| `Scan` | Tenant | `organizationId` |
| `Booking` | Tenant | `organizationId` — null = platform |
| `ClinicSettings`, `ClinicPatient`, `ApiKey` | Tenant | `organizationId` |
| `TrainingRecord`, `AuditLog` | Tenant | `organizationId` — nullable |
| `Product` | Tenant or global | `organizationId` — null = platform catalogue |
| `Member`, `Invitation` | Tenant relation | `organizationId` |
| `ScanResult`, `Report`, `ScanFeedback` | Tenant, inherited | via `scanId`, 1:1 with `Scan` |
| `Payment` | User | — |
| `ScanBalance`, `ScanLedger` | User | — |
| `UserProfile`, `UserLocation`, `BillingProfile` | User | — |
| `ChatConversation`, `ChatMessage` | User | — |
| `User`, `Session`, `Account` | Global | — |
| `ExpertProfile`, `ExpertAvailabilitySlot`, `ExpertReview` | Global | — |
| `AffiliateProfile`, `AffiliateOrder`, `AffiliatePayout` | Global | — |
| `ClinicPlan`, `ScanPack`, `AiModelRate`, `Ingredient` | Global | — |

## Enforcement

`organizationId` on a row is the ownership fact. `TenantScope` is what stops a
query forgetting it: a branded string obtainable only by resolving an **active**
membership, so an id taken from a route param or form field will not typecheck
into a scoped query.

It is the standard for tenant-owned repositories. Used today by
`clinics/queries.ts`, `clinics/analytics.ts` and `api-keys/authenticate.ts`;
each module adopts it as it migrates, rather than in one sweeping refactor.

## The questions a new model must answer

1. Who is the user?
2. Which tenant are they operating in?
3. Do they have a membership, and is it `active`?
4. What is their tenant role?
5. What permission does this action require?
6. Is the resource global, user-owned, or tenant-owned?
7. How is tenant isolation enforced for it?
8. Should the action be audited?
