const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'mchost-manager-secret-' + Math.random().toString(36);
const PASSWORD_HASH = process.env.MCHOST_PASSWORD
  ? bcrypt.hashSync(process.env.MCHOST_PASSWORD, 10)
  : null;

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again in a minute.' },
});

router.get('/status', (req, res) => {
  res.json({ authEnabled: !!PASSWORD_HASH });
});

router.post('/login', loginLimiter, async (req, res) => {
  if (!PASSWORD_HASH) {
    return res.status(400).json({ error: 'Authentication is not enabled on this server.' });
  }

  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required.' });

  const valid = await bcrypt.compare(password, PASSWORD_HASH);
  if (!valid) return res.status(401).json({ error: 'Incorrect password.' });

  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

router.post('/logout', (req, res) => {
  res.json({ ok: true });
});

// Export middleware for use in index.js
function bearerAuth(req, res, next) {
  if (!PASSWORD_HASH) return next();
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { router, bearerAuth, JWT_SECRET };
