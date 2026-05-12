require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const Stripe  = require('stripe');

const uploadRoute   = require('./routes/upload');
const registerRoute = require('./routes/register');

const app    = express();
const PORT   = process.env.PORT || 3000;
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ── Middleware ──────────────────────────────────────────────

app.use(cors({ origin: 'http://localhost:4321' }));

// Stripe webhook MUST come before express.json()
app.use('/api/checkout/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/files', express.static(path.join(__dirname, 'uploads')));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/upload',   uploadRoute);
app.use('/api/register', registerRoute);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Stripe: Create Payment Intent ───────────────────────────
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { firstName, lastName, paymentMethodId, totalAmount } = req.body;

        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).json({ error: 'Invalid total amount' });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount,          // amount in cents, e.g. 1500 = $15.00
            currency: 'usd',
            payment_method: paymentMethodId,
            confirmation_method: 'manual',
            confirm: true,
            return_url: `${req.protocol}://${req.get('host')}/success`
        });

        if (
            paymentIntent.status === 'requires_action' &&
            paymentIntent.next_action.type === 'use_stripe_sdk'
        ) {
            // 3D Secure — send client_secret back so the browser can confirm
            return res.json({
                requiresAction: true,
                clientSecret: paymentIntent.client_secret
            });
        }

        if (paymentIntent.status === 'succeeded') {
            return res.json({ success: true, redirectUrl: '/success' });
        }

        return res.status(400).json({ error: 'Payment failed — unexpected status: ' + paymentIntent.status });

    } catch (err) {
        console.error('[Stripe]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── Success page (plain HTML served by Express) ─────────────
app.get('/success', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Successful — Stellarwaves</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f1117;
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #e8e4dc;
    }
    .card {
      text-align: center;
      background: #161b27cc;
      border: 2px solid #ffffff33;
      border-radius: 18px;
      padding: 3rem 3.5rem;
      box-shadow: 0 8px 40px rgba(0,0,0,.6);
      max-width: 480px;
      width: 90vw;
      animation: popIn .5s cubic-bezier(.22,1,.36,1) both;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      display: block;
      animation: spin 1s ease-out both;
    }
    h1 {
      font-size: 2rem;
      color: #00dfc4;
      margin-bottom: .75rem;
      letter-spacing: .04em;
    }
    p {
      color: #a0b0c8;
      font-size: 1rem;
      line-height: 1.7;
      margin-bottom: 1.5rem;
    }
    .btn {
      display: inline-block;
      padding: .75rem 2rem;
      background: #00dfc4;
      color: #0f1117;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: background .2s;
    }
    .btn:hover { background: #00c4ac; }
    @keyframes popIn {
      from { opacity: 0; transform: translateY(30px) scale(.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes spin {
      from { transform: rotate(-20deg) scale(.5); opacity: 0; }
      to   { transform: rotate(0deg)   scale(1); opacity: 1; }
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="icon">🚀</span>
    <h1>Transmission Sent!</h1>
    <p>Your payment was processed successfully.<br>
       Your stellar message is now on its way across the cosmos.</p>
    <a class="btn" href="http://localhost:4321/">Return to Stellarwaves</a>
  </div>
</body>
</html>`);
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
