# Deploy ConnectX to Heroku

## 1. Prerequisites

- [Heroku account](https://signup.heroku.com/)
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed

## 2. Deploy

```bash
# Log in
heroku login

# Create app (or use existing)
heroku create connectx-yourname

# Or with a custom name: heroku create
```

## 3. Set config vars

Set all values from your `.env` in Heroku:

```bash
heroku config:set GOOGLE_CLIENT_ID=your-client-id
heroku config:set GOOGLE_CLIENT_SECRET=your-client-secret
heroku config:set SESSION_SECRET=your-random-secret
heroku config:set BASE_URL=https://connectx-yourname.herokuapp.com

heroku config:set CONNECTX_ORDER_EMAIL=your@email.com
heroku config:set CONNECTX_ORDER_PHONE=+15551234567

heroku config:set SMTP_HOST=smtp.gmail.com
heroku config:set SMTP_PORT=587
heroku config:set SMTP_USER=your@gmail.com
heroku config:set SMTP_PASS=your-app-password
heroku config:set SMTP_FROM=ConnectX <your@gmail.com>

heroku config:set TWILIO_ACCOUNT_SID=your-sid
heroku config:set TWILIO_AUTH_TOKEN=your-token
heroku config:set TWILIO_PHONE_NUMBER=+15551234567
```

**Important:** `BASE_URL` must be your Heroku app URL (e.g. `https://your-app-name.herokuapp.com`) or your custom domain once added.

## 4. Deploy from Git

```bash
# If not already a git repo
git init
git add .
git commit -m "Initial commit"

# Add Heroku remote (use your app name)
heroku git:remote -a connectx-yourname

# Deploy
git push heroku main
```

If your branch is `master` instead of `main`:
```bash
git push heroku master
```

## 5. Update Google OAuth

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Edit your OAuth 2.0 client
2. Add to **Authorized redirect URIs**:
   - `https://your-app-name.herokuapp.com/auth/google/callback`
3. Add your custom domain callback too if you use one:
   - `https://yourdomain.com/auth/google/callback`

## 6. Custom domain (optional)

```bash
heroku domains:add www.yourdomain.com
```

Then add the CNAME or ALIAS record at your DNS provider as Heroku instructs. After that, set:

```bash
heroku config:set BASE_URL=https://www.yourdomain.com
```
