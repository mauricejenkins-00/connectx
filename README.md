# ConnectX

Sell emojis in exchange for donations. Users can browse emojis, add them to their order, and submit with optional donor info and donation amount.

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Email notifications

To send each order to your email, set these environment variables:

| Variable | Description |
|----------|-------------|
| `CONNECTX_ORDER_EMAIL` | Email address to receive orders |
| `SMTP_HOST` | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | Port (587 for TLS) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password (Gmail: use an [App Password](https://support.google.com/accounts/answer/185833)) |
| `SMTP_FROM` | Optional "From" address |

Copy `.env.example` to `.env`, fill in your values, and restart the server. Use `dotenv` or your host’s env config to load them.

## SMS (text messaging)

ConnectX can send and receive communications via phone/SMS using [Twilio](https://www.twilio.com/):

- **Order confirmations** — Users who enter a phone number receive an SMS confirmation
- **Admin alerts** — New orders can be texted to `CONNECTX_ORDER_PHONE`
- **User confirmation emails** — If users enter an email (and SMTP is configured), they receive an email confirmation

Set in `.env`: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, and optionally `CONNECTX_ORDER_PHONE` for admin text alerts.

## Sign in with Google

Users can log in with their Gmail account. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/): add redirect URI `http://localhost:3000/auth/google/callback`, then set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `SESSION_SECRET` in `.env`. For production, set `BASE_URL` to your app URL.

## Features

- Emoji catalog — browse and select emojis
- Order form — name, donation amount, and message
- Order storage — orders saved to `orders.json`
- Email notifications — orders sent to the configured address
- SMS/phone notifications — order confirmations and admin alerts via Twilio
- Sign in with Google — users log in with their Gmail account
