# Meet + Gmail notifications — Cloudflare + Google (no Supabase, no GitHub Actions)

Current status: **Code implemented, additional Google authorization required**. Existing
service-account variables for free/busy remain intact. Do not share credentials
or OAuth refresh tokens in GitHub, screenshots, chats or Netlify.

## What the extension does

With user OAuth configured:

1. A visitor chooses a genuine free **30-minute slot**.
2. The existing service account checks personal + Portfolio Meetings calendars.
3. The Worker creates the event as the **actual Google account owner**, asking
   Calendar for a fresh Google Meet link using \`conferenceDataVersion=1\`.
4. The server rejects or rolls back the event if Meet generation does not
   succeed. It never invents a Meet URL.
5. The Worker stores booking notification metadata in its existing
   SQLite-backed \`BookingGate\` Durable Object (per local calendar day).
6. A Durable Object **Alarm** sends confirmation emails to the visitor and
   organizer through the authenticated Gmail API. Emails contain the generated Meet URL.
7. Approximately **15 minutes before the start**, an alarm checks that the
   Google Calendar event still exists and Gmail sends reminder messages to
   the same two people. The reminder time is based on the event timestamp,
   not a fixed New York cron time — DST is handled automatically.
8. The booking page displays the real Meet URL and a clear notification status.

One Gmail account, one Cloudflare Worker, the existing Google Calendar and
service account, and Cloudflare Durable Object alarms. **No Supabase, paid
Netlify tier, Resend account or GitHub Actions** needed.

### Important limitations

- You must complete OAuth configuration first. Until then, the existing
  service-account booking process still works but cannot promise Meet or
  automated emails. The booking result explicitly says which features are
  configured.
- An alarm generally runs near its scheduled time, **not guaranteed to the
  second**. Gmail delivery timing can depend on mail providers.
- No attendee is automatically added to Google Calendar; the attendee receives
  their Meet invitation by **Gmail email**. This avoids Google service-account
  attendee restrictions. The organizer already sees the event on the shared
  calendar.
- This is not an email marketing platform; Gmail sending quotas and Google API
  scopes apply. Never use it for mailing lists.
- Individual email sends are recorded after Gmail accepts them and retried on
  transient errors. A rare interruption between send and recording success
  can send a duplicate; Gmail is not an exactly-once queue.
- If you **cancel a calendar event** before the reminder, its 15-minute
  notification is skipped. Editing the event time in Google Calendar directly
  does not reschedule the existing alarm; reschedule via a booking admin
  flow once implemented, or cancel and book a new slot.
- Personal data needed for reminders is stored in Cloudflare Durable Object
  storage until delivery and removed after reminders or shortly after the
  appointment. Do not export or log participant emails unnecessarily.

## Step 1 — Enable Gmail API in your EXISTING Google Cloud project

Google Cloud Console → Select **Pietro Portfolio Booking** →
APIs & Services → Library → enable **Gmail API**.

You have already enabled Calendar API and created a service account.
Do not delete or recreate it.

## Step 2 — Google Auth Platform and OAuth application

Open Google Cloud → Google Auth Platform (OAuth consent screen).
Create/configure an app for your own portfolio booking system:

- App name: \`Pietro Portfolio Booking\`
- User type / audience: **External** (for a personal Gmail account)
- Add yourself as a test user if the app is in **Testing**
- Required scopes:
  - \`https://www.googleapis.com/auth/calendar.events\`
  - \`https://www.googleapis.com/auth/gmail.send\`

The app will ask you for consent to manage events and **send emails
as your Gmail account**. Grant only if that is what you intend.

**Token longevity**: External OAuth apps in **Testing** issue refresh
tokens that commonly expire after **7 days** for these scopes. For
ongoing production booking, follow Google's publishing / verification rules.
Some scopes may require extra approval, depending on Google's current
requirements. A test-only token is NOT a production solution.

## Step 3 — Create OAuth Client ID

Google Cloud → Google Auth Platform → Clients → **Create client**:

- Application type: **Web application**
- Name: \`Portfolio Booking Worker\`
- Authorized redirect URI:
  \`https://developers.google.com/oauthplayground\`

This URI is required for the one-time Google OAuth Playground setup below.
Copy Client ID and Client Secret locally. Do not commit them.

## Step 4 — Authorize yourself once using Google OAuth Playground

Official site: https://developers.google.com/oauthplayground/

- Click the gear settings.
- Enable **Use your own OAuth credentials**.
- Enter **your** newly created Web OAuth Client ID and Client Secret.
- Access type must be **Offline**; force consent when obtaining a new token.
- In "Step 1 Select & authorize APIs", manually enter the **two scopes**
  above, separated by a space, and click **Authorize APIs**.
- Sign in with the actual Google account that owns **Portfolio Meetings**
  and has Gmail to send from. Confirm both permissions.
- Under "Step 2" click **Exchange authorization code for tokens**.
- Copy only the **Refresh token** locally.

Use your own OAuth credentials in the Playground so its short-lived
default-provider token policy does not apply. Do not paste the refresh
token in this chat or GitHub.

## Step 5 — Cloudflare Secrets, not Netlify

Cloudflare Dashboard → Workers & Pages → **pietroforestieriportfolio** →
Settings → **Variables and Secrets → Add**:

| Name | Type | Value |
|---|---|---|
| \`GOOGLE_OAUTH_CLIENT_ID\` | Secret | OAuth web client ID |
| \`GOOGLE_OAUTH_CLIENT_SECRET\` | **Secret** | OAuth web client secret |
| \`GOOGLE_OAUTH_REFRESH_TOKEN\` | **Secret** | OAuth refresh token |
| \`BOOKING_ORGANIZER_EMAIL\` | Text | Your Gmail address that receives notifications |
| \`EMAIL_NOTIFICATIONS_ENABLED\` | Text | \`true\` **only after first OAuth/calendar test** |

The previous service-account secrets (\`GOOGLE_SERVICE_ACCOUNT_EMAIL\`,
\`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY\`) and calendar IDs must **remain**.

In the Cloudflare Worker you already use **Variables and Secrets**, and
\`keep_vars=true\` in the Wrangler config preserves dashboard values during
deploys. Never copy secrets into \`wrangler.toml\`.

## Step 6 — Verify OAuth before enabling email

After Workers Builds deploys the latest version, open:

\`\`\`
https://booking.propertydex.xyz/health
https://booking.propertydex.xyz/api/calendar/oauth-check
\`\`\`

Expect \`meetCredentialsPresent:true\` and
\`oauthConnected:true,calendarAccess:true\` if authorized.

**Note:** OAuth check confirms Calendar access and token refresh only.
It cannot confirm Gmail's scope or actual delivery without a real test send.

Once OAuth succeeds, set \`EMAIL_NOTIFICATIONS_ENABLED=true\` in Cloudflare.

## Step 7 — Safe real-world test

Create an **available** 30-minute booking on:

\`\`\`
https://pietroforestieri.propertydex.xyz/book
\`\`\`

Use your own secondary mailbox as the guest if possible. Verify:

1. Booking response contains a real \`https://meet.google.com/...\` URL.
2. Google Calendar \`Portfolio Meetings\` has the event and the Meet URL.
3. Gmail sends a confirmation email to the guest and organizer.
4. Confirm the emails show the correct time and Meet link.
5. To test a reminder without bypassing the 24-hour booking lead time,
   temporarily adjust the test scenario under controlled conditions,
   or wait for the genuine booking's scheduled reminder.
6. At ~15 minutes before the appointment, verify both reminder emails.
7. Cancel another test event and verify its reminder is skipped.

Cloudflare → Worker → Observability → Logs can help diagnose Gmail quota,
scope, Meet conference generation or alarm errors. Never log secrets.

## If you prefer not to grant Gmail permissions

It is possible to integrate a separate transactional mail service such as
Resend (free tier with verified domain), but this **code is currently designed
for Google Gmail OAuth** to avoid creating another service or Supabase project.

## Official references

- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/oauthplayground/
- https://developers.google.com/workspace/calendar/api/guides/create-events
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send
- https://developers.cloudflare.com/durable-objects/api/alarms/
