const express = require('express');
const router = express.Router();
const { getExpenses, getExpense, createExpense, updateExpense, deleteExpense } = require('../controllers/expenseController');
const { protect, admin } = require('../middleware/auth');

router.route('/')
    .get(protect, getExpenses)
    .post(protect, admin, createExpense);

router.route('/:id')
    .get(protect, getExpense)
    .put(protect, admin, updateExpense)
    .delete(protect, admin, deleteExpense);

module.exports = router;
