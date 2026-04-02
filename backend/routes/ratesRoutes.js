const express = require('express');
const router = express.Router();
const ratesController = require('../controllers/ratesController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, ratesController.getRates);
router.post('/', protect, admin, ratesController.updateRate);

module.exports = router;
