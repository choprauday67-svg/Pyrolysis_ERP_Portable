const express = require('express');
const router = express.Router();
const { getBatches, createBatch, getBatch, updateBatch, deleteBatch } = require('../controllers/batchController');
const { protect, admin } = require('../middleware/auth');

router.route('/')
    .get(protect, getBatches)
    .post(protect, createBatch);

router.route('/:id')
    .get(protect, getBatch)
    .put(protect, updateBatch)
    .delete(protect, admin, deleteBatch);

module.exports = router;
