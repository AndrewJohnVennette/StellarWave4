require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const Stripe  = require('stripe');

const uploadRoute   = require('./routes/upload');
// const stripeRoute   = require('./routes/stripe');
const registerRoute = require('./routes/register');
const usersRoute    = require('./routes/users');

const app  = express();
const PORT = process.env.PORT || 3000;
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);


// ── Middleware — ORDER MATTERS ──────────────────────────────

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:4321' }));


// Stripe webhook MUST come before express.json()
app.use('/api/checkout/webhook', express.raw({ type: 'application/json' }));

// ✅ These two must exist and must be BEFORE the routes below
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use(session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     cookie: { secure: false },
// }));

app.use('/files', express.static(path.join(__dirname, 'uploads')));

// ── Routes — must come AFTER middleware ────────────────────
app.use('/api/upload',   uploadRoute);
// app.use('/api/checkout', stripeRoute);
app.use('/api/register', registerRoute);
app.use('/api/users',    usersRoute);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
