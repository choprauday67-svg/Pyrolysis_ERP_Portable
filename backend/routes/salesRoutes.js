const express = require('express');
const router = express.Router();
const { getSales, getSale, createSale, updateSale, deleteSale } = require('../controllers/salesController');
const { protect, admin } = require('../middleware/auth');

router.route('/')
    .get(protect, getSales)
    .post(protect, admin, createSale);

router.route('/:id')
    .get(protect, getSale)
    .put(protect, admin, updateSale)
    .delete(protect, admin, deleteSale);

module.exports = router;
