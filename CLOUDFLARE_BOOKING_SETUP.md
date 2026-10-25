# Portfolio Booking — Cloudflare Workers Free (October 2026)

## Status

- Portfolio remains hosted on **Netlify**.
- Domain/DNS remain managed on **Cloudflare** (`propertydex.xyz`).
- The existing interactive booking page remains at `/book`.
- All booking API calls now use **`https://booking.propertydex.xyz`**.
- **Google secrets live only in Cloudflare Worker Secrets**, not GitHub, browser JS or Netlify.
- Bookings stay **disabled by default** until the Cloudflare dashboard variable `BOOKINGS_ENABLED` is set to `true`.
- No GitHub Actions. No Supabase.

## 1A. Easier: deploy directly from Cloudflare dashboard

This approach does **not** create GitHub Actions workflow files. The builds
belong to Cloudflare and run only for the Worker.

1. Open Cloudflare Dashboard → **Workers & Pages → Create application**.
2. Choose to **Import an existing Git repository** and authorize access to
   `patpet21/pietroforestieriportfolio`.
3. Set the Worker name to `pietroforestieriportfolio` to match the existing Cloudflare application and the Wrangler configuration.
4. Configure **Production branch** `main`, **Root directory** `cloudflare`.
5. Leave **Build command** empty; use **Deploy command** `npx wrangler deploy`.
6. Deploy. The `cloudflare/wrangler.toml` file automatically creates the
   SQLite Durable Object binding and migration. No other repo workflow is needed.
7. Continue with **Step 2** to add the custom domain.

If you prefer not to connect GitHub to Cloudflare, use the CLI alternative below.

## 1B. Deploy the Worker once (no new app backend provider)

The `cloudflare/` directory contains the complete Worker and its
SQLite-backed Durable Object booking lock.

On your Windows computer, ensure Node.js is installed. Open **PowerShell** in
a local clone of `https://github.com/patpet21/pietroforestieriportfolio`,
and run:

```powershell
git pull origin main
npx wrangler login
npx wrangler deploy --config cloudflare/wrangler.toml
```

Sign in with the **same Cloudflare account** that manages `propertydex.xyz`.
Wrangler may ask to install its package for this command; this does not create
a GitHub Actions workflow or move hosting.

The deploy creates `pietroforestieriportfolio` and its SQLite-backed
`BOOKING_LOCKS` Durable Object. The Worker intentionally has no public
`workers.dev` URL until you attach the custom domain below. Workers + SQLite Durable Objects and Worker
Secrets are supported on the Free plan subject to Cloudflare limits.

## 2. Attach the Cloudflare custom domain

Cloudflare Dashboard → **Workers & Pages** → `pietroforestieriportfolio`
→ **Settings → Domains & Routes → Add → Custom Domain**:

```
booking.propertydex.xyz
```

Cloudflare creates the needed DNS record and TLS certificate. Do not use
`pietroforestieri.propertydex.xyz` for the Worker: that hostname belongs to
the Netlify frontend. The `booking.` subdomain is the API only.

Health check in a browser:

```
https://booking.propertydex.xyz/health
```

Before secrets are added, expect `googleConfigured: false` and
`bookingsEnabled: false`.

## 3. Set Google Calendar credentials ONLY on Cloudflare

Cloudflare → Workers & Pages → `pietroforestieriportfolio` →
**Settings → Variables and Secrets → Add**.

Add these keys (the Google Calendar API must already be enabled, and the
service account must have appropriate calendar-sharing permissions):

| Key | Type | Value |
|---|---|---|
| `GOOGLE_CALENDAR_ID` | Text | ID of shared `Portfolio Meetings` calendar |
| `GOOGLE_BUSY_CALENDAR_IDS` | Text | ID of shared personal `Peter Forestieri` calendar |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Text | JSON `client_email` |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | **Secret** | JSON `private_key` value, including BEGIN/END lines |
| `BOOKINGS_ENABLED` | Text | Keep `false` until integration testing |

Do **not** use JSON `project_id`, `private_key_id` or `client_id` as a
calendar ID. The full JSON file is **not** added to the Worker. Only the two
values above are needed.

The `private_key` can have literal `\\n` sequences from the JSON or real
line breaks. Do not include outer JSON quotation marks. **Never paste the
secret in chat, screenshot it, upload it to the repository or commit it.**

Cloudflare Secrets are encrypted at rest and masked in the dashboard. There is
no Netlify upgrade required.

### Important: remove legacy Netlify secrets

Netlify → Portfolio site → Environment variables: if
`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` was saved there earlier **without**
the Secret option, delete it after safely adding the Cloudflare Secret.
Also delete old unused Google Calendar identifiers/email from Netlify.
The project no longer uses Netlify Functions for bookings.

## 4. Origins and booking hours

These defaults are in `cloudflare/wrangler.toml`:

```toml
ALLOWED_ORIGINS = "https://pietroforestieri.propertydex.xyz,https://pietroforestieri.netlify.app"
BOOKING_START_HOUR = "9"
BOOKING_END_HOUR = "17"
BOOKING_WEEKDAYS = "1,2,3,4,5"
BOOKING_MIN_NOTICE_HOURS = "24"
BOOKING_WINDOW_DAYS = "45"
```

If your public portfolio URL differs, update `ALLOWED_ORIGINS` to include
its **exact HTTPS origin**, then redeploy. `keep_vars = true` means
Cloudflare dashboard variables survive future CLI deploys. Incorrect origins will cause a CORS
error and bookings will remain unavailable. No changes to DNS for the
Netlify site are needed.

## 5. Enable bookings only AFTER verification

Check these in order:

1. Open `https://booking.propertydex.xyz/health`; Google configuration
   should show `true` after secrets and IDs are saved.
2. Open your published portfolio `/book`. Before enabling booking, it
   should show setup pending and **no selectable slots**.
3. In Cloudflare → Worker → Settings → Variables and Secrets add
   `BOOKINGS_ENABLED` as a **Text** variable with value `true`; Deploy.
   This variable is deliberately absent from Wrangler configuration and
   `keep_vars = true` preserves it across subsequent CLI deployments.
4. Refresh the portfolio. Only free 15-, 30- and 45-minute slots should
   be selectable.
5. Create a busy event on the personal calendar, refresh, and confirm
   its overlapping slots are unavailable.
6. Make one test booking, verify the event in `Portfolio Meetings`.
7. Attempt to book the same or overlapping slot again. It must reject.
8. Verify that Contact still sends to Formspree independently.

A Google Calendar event is created in the organizer's calendar, not an
automatic Meet meeting. Visitors are not automatically emailed an invite or
a Meet URL with this service-account-only integration. Arrange the meeting
link separately until OAuth/email functionality is explicitly added.

## 6. Booking integrity and limitations

- Google freeBusy checks **both** shared calendars.
- The server validates hours, notice, duration, date and input.
- One SQLite **Durable Object per New York date** serializes overlapping
  reservations from *this Worker*, including simultaneous visitors.
- It queries Google freeBusy **again** before writing the event.
- Expiring reservations protect crash recovery and short Google sync delays.
- External Google Calendar edits created between the check and the event
  insertion can still race with bookings; do not advertise an absolute
  guarantee against every outside integration.
- The API can be targeted by bots. Enable Cloudflare rate limits / Turnstile
  before promoting it heavily, and monitor Worker and Google quotas.
- Cloudflare Workers Free has **100,000 requests/day and 10ms CPU per
  request**. JWT signing on a cold isolate can consume CPU; watch the
  Cloudflare metrics. Upgrade or optimize only if you observe actual limits.

## Files

- `cloudflare/booking-worker.js` — Worker, Google OAuth and booking lock
- `cloudflare/wrangler.toml` — deploy and Durable Object configuration
- `src/components/BookingCalendar.tsx` — internal portfolio scheduler
- `src/components/BookingCalendar.css` — responsive design

## Documentation

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
