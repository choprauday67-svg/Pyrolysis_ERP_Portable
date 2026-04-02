const express = require('express');
const router = express.Router();
const { getProductions, getProduction, createProduction, updateProduction, deleteProduction } = require('../controllers/productionController');
const { protect, admin } = require('../middleware/auth');

router.route('/')
    .get(protect, getProductions)
    .post(protect, admin, createProduction);

router.route('/:id')
    .get(protect, getProduction)
    .put(protect, admin, updateProduction)
    .delete(protect, admin, deleteProduction);

module.exports = router;
