# ConnectX Setup Guide

## 1. Create your `.env` file

Copy the example and add your real credentials:

```bash
copy .env.example .env
```

Then edit `.env` and replace placeholder values.

## 2. Fix "Cannot GET /auth/google"

This usually means either:

- **No `.env` file** – Create it from `.env.example`.
- **Missing Google credentials** – Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
- **Wrong callback URL in Google Console** – Add `http://localhost:3000/auth/google/callback` as an authorized redirect URI.

Restart the server after changing `.env`.

## 3. Fix emails not sending

For Gmail:

1. Set in `.env`:
   - `CONNECTX_ORDER_EMAIL` – your address to receive orders
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER` – your full Gmail address
   - `SMTP_PASS` – an [App Password](https://support.google.com/accounts/answer/185833) (not your normal password)

2. Restart the server and submit a test order. Check the terminal for `Email send failed` messages.

## 4. Fix texts not sending

For Twilio:

1. Create an account at [twilio.com](https://www.twilio.com) and get a phone number.
2. Set in `.env`:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER` – your Twilio number (e.g. `+15551234567`)

3. To receive order alerts by text, set `CONNECTX_ORDER_PHONE` to your phone number.

4. To send confirmations to users, they must enter their phone number in the order form.

Restart the server after changing `.env`.
