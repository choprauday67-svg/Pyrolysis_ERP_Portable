const express = require('express');
const router = express.Router();

const { loginUser, registerUser, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/me', protect, getMe);

module.exports = router;