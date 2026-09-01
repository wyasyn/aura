# Audit durability

Which operations may proceed when their audit entry cannot be written, and
which may not.

Companion documents: [production-tenancy.md](./production-tenancy.md),
[tenant-ownership.md](./tenant-ownership.md).

---

## The problem

`recordAudit` catches its own errors and logs them. That is the right default —
refusing every action because the log table is full would mean a patient could
not revoke consent — but it was applied uniformly, including to operations
whose *only* lasting evidence is the audit row:

```
mutation succeeds  →  audit write fails  →  stderr line  →  operation is now unrecorded
```

A clinic once disappeared from this system leaving nothing to point at. That
incident is the reason this document exists.

---

## Two functions, two policies

| | Failure behaviour | Where it writes |
| --- | --- | --- |
| `recordAudit(entry)` | swallows, logs to stderr | its own connection |
| `recordAuditIn(tx, entry)` | **throws** | the caller's transaction |

`recordAudit` now delegates to `recordAuditIn` inside a `try`, so there is one
write path and one row mapping — the policies differ, the code does not.

`AuditWriter` is `Pick<PrismaClient, "auditLog">`, satisfied structurally by
both the client and a `$transaction` callback's `tx`. No new client, no second
audit system.

---

## Tiering

### Tier A — the record is the point

Audit failure **prevents** the mutation. Called inside `prisma.$transaction`
alongside the write, so both commit or neither does.

| Operation | File |
| --- | --- |
| tenant deletion | `admin/clinic-offboard-actions.ts` |
| membership revoke (clinic) | `clinics/member-actions.ts` |
| membership suspend/reinstate (clinic) | `clinics/member-actions.ts` |
| membership revoke (admin) | `admin/membership-actions.ts` |
| membership suspend/reinstate (admin) | `admin/membership-actions.ts` |
| API-key revoke | `clinics/api-key-actions.ts` |
| custom-domain removal | `clinics/domain-actions.ts` |
| admin data export | `api/admin/clinics/[clinicId]/export` |

These share one property: the mutation removes something, and afterwards the
audit row is the only remaining evidence of what was removed and by whom. A
best-effort write is exactly wrong here.

**The export is the odd one out.** There is no row being changed, so there is
no transaction to join — the thing being recorded is a file leaving the system.
The equivalent guarantee is ordering: the entry is written first, and a failure
to write it returns `503` instead of the data. Data that left with no evidence
that it left is the outcome being prevented.

### Tier B — important, recorded transactionally because a transaction exists

Audit failure fails the operation, not because the record outranks the
mutation, but because the mutation was already transactional and joining it
costs nothing.

| Operation | Why it belongs here |
| --- | --- |
| expert approve / reject | grants or refuses a platform role |
| affiliate approve / reject | grants a platform role and issues a live coupon |
| affiliate payout | money leaving the platform on one person's say-so |

### Tier C — observational

Audit failure is logged and the operation proceeds. Reads, and mutations whose
own row is the evidence.

Examples: `scan.viewed`, `patient.viewed`, `appointment.viewed`,
`report.viewed`, `membership.invited`, `membership.created`, `tenant.created`,
`tenant.domain_claimed`, `apikey.created`, `payment.completed`,
`payment.failed`, `appointment.cancelled`, `training.record.withdrawn`, and
every `recordDenied` call.

Denials are Tier C deliberately. A denial means nothing changed; failing the
request because the *refusal* could not be recorded would turn a log outage
into an outage.

The payment and booking events are Tier C for a sharper reason: both are
reached from a Stripe webhook. A non-2xx response makes Stripe retry, so
failing the request because the log write failed would turn a logging outage
into repeated payment processing. The `Payment` and `Booking` rows are the
authoritative record of the money either way.

Three of these sit behind a compare-and-set, so the entry is written only by
the attempt that actually changed the row — a webhook racing the client confirm
leaves one entry, not two.

**The union has no unwritten members.** Every declared action has a writer, and
a test asserts that in both directions: declaring an action without one fails,
and so does exempting one that is in fact written.

---

## Why the deletion audit can live in the deletion transaction

`AuditLog.organizationId` is a plain column with **no foreign key** to
`Organization`. Deleting the tenant therefore cannot cascade to, or null, the
row describing the deletion — even though both happen in the same transaction.

This is load-bearing. Adding a relation to that column would silently convert
every tenant deletion into the erasure of its own record.

---

## Request correlation

`AuditLog.requestId` and the viewer column that displays it both already
existed; nothing filled them. `lib/audit/request-id.ts` reads the id the
platform already assigns (`x-request-id`, else Vercel's `x-vercel-id`) and
returns `null` outside a request.

Returning `null` rather than throwing is deliberate: a correlation id must
never be the reason a Tier A write fails and rolls back a mutation.

---

## Rules

1. An operation whose evidence could not be written is an operation that
   should not have completed — if it is Tier A.
2. Tier A calls `recordAuditIn` inside the same transaction as the mutation.
   Writing the audit *before* the transaction is not the same guarantee.
3. Never add a foreign key from `AuditLog` to `Organization`.
4. Denials stay Tier C.
5. Adding an action to the union means adding a writer for it. An action
   nobody writes reads, in the viewer, as an event that never happens —
   indistinguishable from one that happens and is not recorded.
