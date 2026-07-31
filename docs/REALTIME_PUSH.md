# New-order push delivery — how it runs, and how fast

## The path

```
POST /api/orders
  └─ emit('order.created')                     lib/platform/events.ts
       └─ enqueue('push.order', …)             INSERT INTO job_queue
                                               ← nothing runs inline
─────────────────────── the worker must run ───────────────────────
GET /api/cron/process-queue   (Bearer CRON_SECRET)
  └─ claim_jobs()  FOR UPDATE SKIP LOCKED
       └─ handler 'push.order'                 lib/platform/queue-handlers.ts
            └─ sendPush()                      lib/push/send.ts → FCM v1 / APNs
```

`emit()` only **enqueues**. Nothing processes the job inline — deliberately, so a
slow or dead push provider can never delay or fail order creation. That means
push latency is entirely determined by **how often the worker is triggered**.

## The problem this solved

The only trigger was Vercel Cron at `0 3 * * *` — once per day. The audit log
confirmed it: heartbeat gaps of exactly 1440.0 minutes, firing between 03:12
and 03:54 UTC. A merchant could wait up to 24 hours for a "new order" alert.

## Current setup

`.github/workflows/process-queue.yml` calls the existing authenticated endpoint
on GitHub's scheduler, **every 5 minutes**.

Chosen because it:

- needs no Vercel plan change and no billing change,
- cannot break the production deployment (it is not part of the build),
- requires no database change,
- reuses the existing `CRON_SECRET` auth and the existing worker,
- changes only *how often* the worker runs — never what it does.

The daily Vercel cron in `vercel.json` is intentionally left in place as a
backstop. Overlap is harmless (see below).

### One-time setup

Repo → Settings → Secrets and variables → Actions → **New repository secret**

| Name | Value |
| --- | --- |
| `CRON_SECRET` | must equal `CRON_SECRET` in Vercel Production |

Then, so Platform Health reports worker liveness against the new cadence
rather than the old daily one, set in Vercel (Production):

```
QUEUE_CRON_INTERVAL_MINUTES = 5
```

Without it, health still assumes a 1440-minute interval and will never flag a
genuinely stalled worker.

## Why frequent runs are safe

`claim_jobs()` selects candidate rows `FOR UPDATE SKIP LOCKED` and flips them to
`processing` in the same statement. Two workers therefore cannot claim the same
job, so **notifications cannot be duplicated** no matter how often, or how
concurrently, the endpoint is called. Retries with exponential backoff,
`recover_stuck_jobs`, stale-token pruning and per-store scoping are all
unchanged — this work did not touch the queue semantics.

## Honest limitation

**This is "within minutes", not "within seconds".**

GitHub's minimum schedule interval is 5 minutes, and scheduled workflows are
best-effort: under platform load GitHub can delay a run, occasionally by 10–15
minutes. Typical delivery is under 5 minutes; the worst case is worse than that.

Anyone who needs sub-minute delivery should use one of the following instead.

## Getting to true minute-level (or faster)

### Option A — Vercel Pro, minute-level cron

Hobby cron is limited to once-daily schedules. On Pro:

```jsonc
// vercel.json
{ "path": "/api/cron/process-queue", "schedule": "* * * * *" }
```

Delivery then lands within ~60 s. **This is a paid-plan change and was
deliberately not made here.** Attempting it on Hobby makes the deployment fail.

### Option B — Supabase `pg_cron` + `pg_net`

Runs on infrastructure you already have, every minute, independent of Vercel:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'process-queue', '* * * * *',
  $$select net.http_get(
      url     := 'https://dakkani.vercel.app/api/cron/process-queue',
      headers := '{"Authorization":"Bearer <CRON_SECRET>"}'::jsonb
    )$$
);
```

Trade-off: `CRON_SECRET` is then stored in the job definition, readable by
anyone with database access. Rotate it if that is a concern.

### Option C — trigger the worker on insert

A Supabase Database Webhook on `job_queue` INSERT calling the same endpoint
gives near-instant delivery. Not implemented here because it adds a database
trigger, and the brief was to avoid schema changes.

## What was NOT changed

`vercel.json` (cron schedule untouched), checkout, order creation, the
storefront, product pages, Meta Pixel, Meta CAPI, TikTok, Snapchat, GA4,
`lib/tracking/*`, and every other commerce path.
