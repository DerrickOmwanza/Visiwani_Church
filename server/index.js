const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');

const db = require('./db');
const { requireLogin } = require('./auth');
const { seedDepartments, seedAdmin } = require('./seed');
const cron = require('./cron');

const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const transactionRoutes = require('./routes/transactions');
const { router: reportRoutes } = require('./routes/reports');

// First run: seed default departments and a default treasurer login so the
// app is usable immediately after `npm start`, with no manual setup step.
seedDepartments();
const createdAdmin = seedAdmin('treasurer', 'visiwani2026');
if (createdAdmin) {
  console.log('==========================================================');
  console.log(' First run - default login created:');
  console.log('   Username: treasurer');
  console.log('   Password: visiwani2026');
  console.log(' Please change this password from Settings after logging in.');
  console.log('==========================================================');
}

const app = express();
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 12 }, // 12 hours
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/departments', requireLogin, departmentRoutes);
app.use('/api/transactions', requireLogin, transactionRoutes);
app.use('/api/reports', requireLogin, reportRoutes);

// Static assets (css/js) are always servable; login.html always servable;
// everything else behind the login gate.
app.use('/css', express.static(path.join(__dirname, '..', 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'public', 'js')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'login.html')));
app.use(requireLogin, express.static(path.join(__dirname, '..', 'public')));
app.get('*', requireLogin, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

// Catches errors passed via next(err) from any route (e.g. asyncHandler in
// reports.js) so a single bad request returns a 500 instead of taking the
// whole app down.
app.use((err, req, res, next) => {
  console.error('Request error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong generating that. Please try again.' });
});

// Last-resort safety net: this app is meant to run unattended on the
// treasurer's computer, so an unexpected error anywhere should be logged
// rather than silently killing the server.
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
process.on('uncaughtException', (err) => console.error('Uncaught exception:', err));

cron.start();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Visiwani SDA Church Books running at http://localhost:${PORT}`);
});
