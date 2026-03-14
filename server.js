require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const SENSITIVE_KEYS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET', 'SMTP_USER', 'SMTP_PASS', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'CONNECTX_ORDER_EMAIL', 'CONNECTX_ORDER_PHONE', 'TWILIO_PHONE_NUMBER', 'BASE_URL'];
function redact(str) {
  if (typeof str !== 'string') return str;
  let out = str;
  SENSITIVE_KEYS.forEach(key => {
    const val = process.env[key];
    if (val && val.length > 4) out = out.replace(new RegExp(val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED]');
  });
  return out;
}
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const nodemailer = require('nodemailer');
const twilio = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const app = express();
const PORT = process.env.PORT || 3000;
const ORDERS_FILE = path.join(__dirname, 'orders.json');
const ORDER_EMAIL = process.env.CONNECTX_ORDER_EMAIL;

const transporter = ORDER_EMAIL && process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER && {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  : null;

// Ensure orders file exists
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
}

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'connectx-dev-secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const hasGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (hasGoogleAuth) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/auth/google/callback`
  }, (accessToken, refreshToken, profile, done) => {
    done(null, {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      photo: profile.photos?.[0]?.value
    });
  }));
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get('/auth/google', (req, res, next) => {
  if (!hasGoogleAuth) {
    return res.status(503).send('Google login is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.');
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
app.get('/auth/google/callback', (req, res, next) => {
  if (!hasGoogleAuth) return res.redirect('/?login=not_configured');
  passport.authenticate('google', { failureRedirect: '/?login=failed' })(req, res, () => res.redirect('/'));
});
app.get('/auth/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});
app.get('/api/me', (req, res) => {
  res.json(req.user || null);
});

// API and auth routes must be registered before static (order matters)
function normalizePhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length >= 10 ? (digits.length === 10 ? `+1${digits}` : `+${digits}`) : null;
}

async function sendSMS(to, body) {
  if (!twilio || !process.env.TWILIO_PHONE_NUMBER) return;
  try {
    await twilio.messages.create({ body, from: process.env.TWILIO_PHONE_NUMBER, to });
  } catch (err) {
    console.error('SMS send failed:', redact(String(err?.message || err)));
  }
}

// API: Submit emoji order
app.post('/api/orders', async (req, res) => {
  const { emojis, donorName, donorEmail, donorPhone, donationAmount, message } = req.body;

  if (!emojis || !Array.isArray(emojis) || emojis.length === 0) {
    return res.status(400).json({ error: 'Please select at least one emoji' });
  }

  const order = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    emojis,
    donorName: donorName || 'Anonymous',
    donorEmail: donorEmail || '',
    donorPhone: donorPhone || '',
    donationAmount: donationAmount || 0,
    message: message || '',
    createdAt: new Date().toISOString()
  };

  const orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  orders.push(order);
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));

  const emojiList = order.emojis.join(' ');
  if (ORDER_EMAIL && transporter) {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'orders@connectx.local',
      to: ORDER_EMAIL,
      subject: `ConnectX order: ${order.id}`,
      text: [
        `Order ID: ${order.id}`,
        `Donor: ${order.donorName}`,
        `Donation: $${order.donationAmount}`,
        `Emojis: ${emojiList}`,
        order.message ? `Message from donor:\n${order.message}` : '',
        `Date: ${order.createdAt}`
      ].filter(Boolean).join('\n'),
      html: `<p><strong>Order ID:</strong> ${order.id}</p>
<p><strong>Donor:</strong> ${order.donorName}</p>
<p><strong>Donation:</strong> $${order.donationAmount}</p>
<p><strong>Emojis:</strong> ${emojiList}</p>
${order.message ? `<p><strong>Message from donor:</strong></p><blockquote style="margin:0.5em 0;padding:0.75em;background:#f5f5f5;border-left:4px solid #ff6b35;">${order.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</blockquote>` : ''}
<p><strong>Date:</strong> ${order.createdAt}</p>`
    };
    transporter.sendMail(mailOptions).catch(err => console.error('Email send failed:', redact(String(err?.message || err)), err?.code || ''));
  }

  const orderSummary = `ConnectX order ${order.id}: ${order.donorName}, $${order.donationAmount}, ${emojiList}`;

  if (normalizePhone(order.donorPhone) && twilio) {
    sendSMS(normalizePhone(order.donorPhone), `Thanks for your order! ${emojiList} Order ID: ${order.id}`);
  }

  const adminPhone = normalizePhone(process.env.CONNECTX_ORDER_PHONE);
  if (adminPhone && twilio) {
    sendSMS(adminPhone, `New ConnectX order: ${orderSummary}`);
  }

  if (order.donorEmail && transporter) {
    const confirmText = [
      `Thanks for your order!`,
      `Emojis: ${emojiList}`,
      `Donation: $${order.donationAmount}`,
      `Order ID: ${order.id}`,
      order.message ? `Your message: ${order.message}` : ''
    ].filter(Boolean).join('\n');
    const confirmHtml = `<p>Thanks for your order!</p><p><strong>Emojis:</strong> ${emojiList}</p><p><strong>Donation:</strong> $${order.donationAmount}</p><p><strong>Order ID:</strong> ${order.id}</p>${order.message ? `<p><strong>Your message:</strong></p><blockquote style="margin:0.5em 0;padding:0.75em;background:#f5f5f5;border-left:4px solid #ff6b35;">${order.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</blockquote>` : ''}`;
    const confirmOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'orders@connectx.local',
      to: order.donorEmail,
      subject: `ConnectX order confirmed: ${order.id}`,
      text: confirmText,
      html: confirmHtml
    };
    transporter.sendMail(confirmOptions).catch(err => console.error('Confirm email failed:', redact(String(err?.message || err)), err?.code || ''));
  }

  res.status(201).json({ success: true, orderId: order.id });
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`ConnectX running at http://localhost:${PORT}`);
  if (!fs.existsSync(path.join(__dirname, '.env'))) {
    console.warn('No .env file found. Copy .env.example to .env and add your credentials.');
  }
  console.log('Configured:',
    [ORDER_EMAIL && transporter && 'email', twilio && 'SMS', hasGoogleAuth && 'Google login'].filter(Boolean).join(', ') || 'none (orders saved to file only)');
});
