# Meet + Gmail: authorize Google from Cloudflare (no Supabase, no OAuth Playground)

## Implemented in the repository

- Netlify still hosts the portfolio.
- Cloudflare Worker \`pietroforestieriportfolio\` still handles booking requests at
  \`booking.propertydex.xyz\`.
- The existing service account checks the organizer's Google Calendar availability.
- A new, separate **Cloudflare Durable Object** stores your Google OAuth refresh token
  **encrypted with AES-GCM**. It never appears in repository files or browser URLs.
- The Google connection page has a **Connect with Google** button (no password form).
  Google shows account selection and consent. AES-GCM authenticated OAuth state
  and PKCE protect the callback, which verifies the organizer's Google account.
- Once connected, new confirmed bookings can create a distinct Google Meet link.
- When email notifications are enabled, Gmail confirmation emails go to the visitor
  and organizer. Durable Object alarms schedule reminders about 15 minutes before.
- If not authorized, the existing booking service continues without Meet or Gmail.
- No Supabase project, GitHub Actions, Netlify paid tier or OAuth Playground.

### Important security and operational limits

This is a personal use integration. Your Google account alone is authorized, not
all portfolio visitors. Be aware Google may show an unverified app warning. Google
may require verification for broader distribution or some restricted/sensitive scopes.

Refresh tokens for External apps in Google's **Testing** status normally expire
after **7 days** when Calendar/Gmail scopes are requested. To use an ongoing
personal authorization, review Google's **Audience → Publish app** process and
the personal-use verification exception; Production alone does not guarantee
unlimited access or remove any Google warning. Tokens may still be revoked by
Google or the account owner.

Cloudflare Free plan limits and Google sending quotas apply. Reminders are
scheduled near 15 minutes before a call, not precisely to the second.

## Step 1 — Add the new Google redirect URI

Use your EXISTING Google Cloud project **Pietro Portfolio Booking** and
EXISTING web OAuth client **Portfolio Booking Worker**.

1. Open https://console.cloud.google.com/auth/clients
2. Select your web client.
3. In **Authorized redirect URIs**, add this exact URL:

   \`\`\`
   https://booking.propertydex.xyz/api/oauth/callback
   \`\`\`

4. Save. The previously entered OAuth Playground URI may be removed if unused.

The \`https\`, domain, path and absence of trailing slash must match exactly.

## Step 2 — Verify scopes and audience

In https://console.cloud.google.com/auth/data-access, keep:

- \`https://www.googleapis.com/auth/calendar.events\`
- \`https://www.googleapis.com/auth/gmail.send\`

The flow also asks for basic identity (\`openid email\`) so it can refuse the
wrong Google account.

At https://console.cloud.google.com/auth/audience, confirm that the Google
account you intend to authorize is permitted. For production personal use,
check **Publishing status** and Google's verification warnings/requirements.
Do not authorize an account that does not own or have sufficient write access
to the selected **Portfolio Meetings** calendar.

## Step 3 — Add four Cloudflare settings

Cloudflare Dashboard → Workers & Pages → **pietroforestieriportfolio** →
Settings → **Variables and Secrets**.

| Key | Type | Value |
|---|---|---|
| \`GOOGLE_OAUTH_CLIENT_ID\` | Secret | Web OAuth Client ID |
| \`GOOGLE_OAUTH_CLIENT_SECRET\` | **Secret** | Web OAuth Client Secret |
| \`BOOKING_ORGANIZER_EMAIL\` | Text | Gmail address of the calendar owner / intended sender |
| \`OAUTH_SETUP_TOKEN\` | **Secret** | Existing secret key used internally for encryption and OAuth state validation. NEVER typed into the authorization page. |

The existing \`OAUTH_SETUP_TOKEN\` remains inside Cloudflare solely as an internal
signing and encryption key. You do **not** type or paste any password during
Google authorization. Do not share, reveal, or commit this secret.

**Do not change or delete \`OAUTH_SETUP_TOKEN\` after authorizing Google**:
it is also the encryption-key input for the stored refresh token. If you
rotate it, reconnect Google using the new token so the stored credential
can be re-encrypted.

Existing secrets \`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY\`,
\`GOOGLE_SERVICE_ACCOUNT_EMAIL\`, \`GOOGLE_CALENDAR_ID\` and
\`GOOGLE_BUSY_CALENDAR_IDS\` must stay as they are.

Do NOT create or paste a manual \`GOOGLE_OAUTH_REFRESH_TOKEN\`.
The new callback stores the token automatically in the Cloudflare vault.

Leave \`EMAIL_NOTIFICATIONS_ENABLED\` unset or \`false\` until the integration
has been checked.

## Step 4 — Connect your organizer Google account (one click)

After Cloudflare deploys the new Worker code, open:

\`\`\`
https://booking.propertydex.xyz/admin/google
\`\`\`

Click **CONNECT WITH GOOGLE** once, then choose the exact account configured in
\`BOOKING_ORGANIZER_EMAIL\`. Google will ask you to approve Calendar event
access, Gmail sending, and basic identity. After consent, Google sends
you back to Cloudflare and you should see a green success message.

The Worker has **no administrator password input, no form, and no setup cookie**.
The connection begins with a GET redirect to Google. The Worker verifies a
short-lived encrypted OAuth state containing the PKCE verifier, granted
scopes, and the exact authorized organizer email before saving refresh token
ciphertext. Google's authorization code can be exchanged only once.

## Step 5 — Test the live connection

Check:
- \`https://booking.propertydex.xyz/health\`
- \`https://booking.propertydex.xyz/api/calendar/oauth-check\`

Expected **after successful consent**:
- \`meetCredentialsPresent: true\`
- \`oauthConnected: true\`
- \`calendarAccess: true\`

The OAuth check does not send an email, so \`gmailSendingNotYetTested\`
is expected. It confirms the token can refresh and the account can access
the selected Google Calendar.

## Step 6 — Branded email confirmation and 15-minute reminder

**Implemented on GitHub (2026-10-25).** The Worker deploy configuration
`cloudflare/wrangler.toml` declares:

```toml
EMAIL_NOTIFICATIONS_ENABLED = "true"
```

The existing Google OAuth organizer authorization is used for Gmail sending.
Cloudflare dashboard variables can override or survive a Wrangler deployment
(`keep_vars=true`); use the public `/health` endpoint to confirm the
runtime reports `notificationSettingsPresent: true`. GitHub build success
is not proof that the live Gmail API has accepted a message.

The Worker now sends **multipart/alternative HTML + plain-text** confirmations
with a responsive dark-green/gold design and a six-image, clickable portfolio
signature. The images are hosted on the URLs supplied by the owner; clients
blocking images still see product names and usable text links.

For each **new** booking after notifications are enabled:
1. Confirmation email is queued to the visitor, with the booking time and
   personalized **Join Google Meet** button.
2. A separate booking email is queued to Pietro (organizer).
3. A Cloudflare Durable Object alarm schedules reminders for both recipients
   roughly **15 minutes before** the booked start.
4. Both reminder emails contain the same booking-specific Meet URL.

The actual Google Meet link is generated by Google Calendar and never invented.
Notifications are queued only after the Calendar event was successfully saved.

**Existing bookings made while email notifications were disabled are not
retroactively queued.** Verify by reserving a **new** 30-minute consultation
with a secondary email address that you control. Check the recipient inbox,
the organizer inbox, and their spam folders. The queued flag confirms
scheduling, not actual Gmail delivery. If messages don't arrive, inspect
Cloudflare Worker / Durable Object logs for `Gmail notification failed`.

OAuth status can be read at:
- `https://booking.propertydex.xyz/api/calendar/oauth-check`
- `https://booking.propertydex.xyz/health`

Reminder alarm execution has delivery/retry constraints; it is not guaranteed
to arrive at exactly the 15-minute mark, and a Gmail failure is retried.
Turning email notifications off does not automatically cancel queued messages.

## Troubleshooting

| Symptom | Check |
|---|---|
| Setup page says not configured | Add all four Cloudflare settings and deploy |
| OAuth \`redirect_uri_mismatch\` | URI in the Google Cloud client is exactly the Cloudflare callback |
| Google account refused | The organizer email must match the Google account granting access |
| \`access_denied\` / unverified app warning | Check Audience status, Google scopes and personal-use policy |
| OAuth success but Gmail missing | Verify Gmail API is enabled, \`EMAIL_NOTIFICATIONS_ENABLED\` is \`true\`, and test Worker logs |
| App stops after seven days | Check whether Google Auth Platform is still in External Testing |
| AES decryption error after changing setup secret | Restore original secret or reauthorize and replace encrypted token |

## References

- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
- https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
- https://developers.cloudflare.com/durable-objects/api/alarms/
