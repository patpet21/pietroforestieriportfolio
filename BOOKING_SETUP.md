# Booking Setup — Cloudflare Workers (current)

The portfolio booking API has moved from Netlify Functions to **Cloudflare
Workers Free**, with Google credentials stored as Cloudflare Secrets.

**Follow the current step-by-step guide:**
[CLOUDFLARE_BOOKING_SETUP.md](./CLOUDFLARE_BOOKING_SETUP.md)

The previous Netlify Functions instructions are obsolete. Do not store your
Google private key as a regular Netlify environment variable. The interactive
calendar still lives on your Netlify-hosted portfolio at `/book` and will
connect to `https://booking.propertydex.xyz` once you deploy its Worker.

No GitHub Actions, no new Supabase project, and no paid Netlify upgrade.
