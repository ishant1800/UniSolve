const express = require('express');
const { register, login, getCurrentUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

const router = express.Router();

// Define input validation schemas
const registerSchema = {
  name: { required: true, minLength: 2, maxLength: 50 },
  email: { required: true, isEmail: true },
  password: { required: true, isStrongPassword: true },
};

const loginSchema = {
  email: { required: true, isEmail: true },
  password: { required: true },
};

// Protect auth routes against brute-force (15 requests per 15 minutes)
const authRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many login or registration attempts. Please try again in 15 minutes.',
});

router.post('/register', authRateLimit, validate(registerSchema), register);
router.post('/login', authRateLimit, validate(loginSchema), login);
router.get('/me', protect, getCurrentUser);

module.exports = router;

