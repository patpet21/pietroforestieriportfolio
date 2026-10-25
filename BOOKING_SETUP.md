# Portfolio booking — Google Calendar setup

The public booking interface lives at `/book`. It is an original in-site
weekly scheduler with 15, 30 and 45-minute appointments. It is intentionally
**closed** until Google Calendar is connected. There are no mock bookable slots.

## Step-by-step: Google Calendar (server-side only)

1. In **Google Calendar → Other calendars → + → Create new calendar**, create
   `Pietro Forestieri — Portfolio Meetings`. Set the time zone to
   `America/New_York`.
2. In that calendar's **Settings → Integrate calendar**, copy the **Calendar ID**.
   Do not use the public iCal/HTML URLs.
3. In [Google Cloud Console](https://console.cloud.google.com), select or
   create a project. Enable **Google Calendar API** under
   **APIs & Services → Library**.
4. Open **IAM & Admin → Service Accounts**. Create a service account, such as
   `portfolio-booking`. Copy the service account email, usually ending in
   `.iam.gserviceaccount.com`.
5. From the service account → **Keys → Add key → Create new key → JSON**,
   download the file to your local computer. **Never commit it to GitHub,
   paste it into a prompt, or place it in Vite `VITE_*` variables.**
6. In your new Google Calendar → **Settings and sharing → Share with specific
   people or groups**, add the service account email. Give it **Make changes
   to events** (not "Make changes and manage sharing").
7. To prevent conflicts with your existing personal appointments, also share
   the personal calendar with the service account, with permission
   **See only free/busy (hide details)**. Copy that calendar's Calendar ID
   from its **Integrate calendar** section. The API must have access to all
   calendars used for conflict checking.
8. In **Netlify → Site configuration → Environment variables**, add the
   following variables with runtime **Functions** scope (or All scopes):

   - `GOOGLE_CALENDAR_ID`: dedicated Portfolio Meetings calendar ID.
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: service account `client_email` from JSON.
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: the JSON `private_key` value,
     including BEGIN/END lines. Either multiline or with literal `\n` is accepted.
   - `GOOGLE_BUSY_CALENDAR_IDS`: optional comma-separated IDs of other
     calendars to include in the conflict check (for example your shared
     personal calendar).
   - `BOOKING_START_HOUR`: `9` (default, New York time).
   - `BOOKING_END_HOUR`: `17` (default).
   - `BOOKING_WEEKDAYS`: `1,2,3,4,5` (Mon–Fri; 0 is Sunday).
   - `BOOKING_MIN_NOTICE_HOURS`: `24` (default).
   - `BOOKING_WINDOW_DAYS`: `45` (default).
   - `BOOKING_ALLOWED_ORIGINS`: optional comma-separated custom domains
     where booking POST requests are allowed, including the real site origin.

9. Trigger a fresh deploy after setting environment variables. Netlify
   Functions cannot read secrets defined only in `netlify.toml`.
10. Visit `https://YOUR-SITE/book` and choose a 30-minute slot. Confirm
    that it is recorded in the dedicated Google Calendar.
11. Add a busy event in the personal Google Calendar that overlaps an otherwise
    open slot, refresh `/book`, and confirm that slot is disabled.
12. Test the contact form separately at `/contact`; it sends to Formspree
    `https://formspree.io/f/mojboraw`.

## Current behavior and safeguards

- Availability is computed on the server via Google Calendar **freeBusy**.
  Guests never see titles, descriptions, or personal busy-event details.
- The booking POST validates the selected time, the caller's input and the
  business-hours policy; it queries Google freeBusy **again** just before
  inserting the appointment into the dedicated calendar.
- Duplicate requests for the same exact slot use a stable Calendar event ID.
- The slot grid stays disabled if credentials are absent or Google returns an
  error. Do not replace this with fictitious availability.
- A service account cannot automatically invite external attendees through
  Google Calendar without domain-wide delegation. The appointment is written
  to your calendar, but **a visitor email and unique Google Meet invitation are
  not automatically sent** by this version. You must arrange video-call
  details separately, or later add a user OAuth/email integration.
- **Concurrency limitation:** Google freeBusy followed by event insertion is
  not a single atomic operation. In a rare simultaneous request for
  different but overlapping intervals, a conflict is still possible. For
  mathematically guaranteed non-overlap, add a transactional reservation
  database with an exclusion constraint, or use Google Calendar Appointment
  Schedules as the authoritative final booking engine. Do not publicly promise
  a hard no-double-booking guarantee until that is implemented and tested.
- This custom endpoint is public. For production traffic, add abuse controls
  (CAPTCHA/Turnstile or rate limiting), monitor quotas, and establish a
  cancellation/rescheduling policy.

## Reference implementation

- Frontend: `src/components/BookingCalendar.tsx` and `.css`
- Functions: `netlify/functions/calendar-availability.mjs` and
  `calendar-book.mjs`
- Google client: `netlify/lib/google-calendar.mjs`
- Time zone: `America/New_York`, automatically accounting for DST
- API routes: `/api/calendar/availability`, `/api/calendar/book`

Documentation:
- https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- https://docs.netlify.com/build/functions/configuration/
- https://docs.netlify.com/build/functions/environment-variables/
