const express = require('express');
const router = express.Router();
const { getInventories, getInventory, createInventory, updateInventory, deleteInventory, getInventorySummary } = require('../controllers/inventoryController');
const { protect, admin, authorize } = require('../middleware/auth');

router.route('/')
    .get(protect, getInventories)
    .post(protect, authorize('Admin', 'Worker'), createInventory);

router.get('/summary', protect, getInventorySummary);

router.route('/:id')
    .get(protect, getInventory)
    .put(protect, authorize('Admin', 'Worker'), updateInventory)
    .delete(protect, admin, deleteInventory);

module.exports = router;
