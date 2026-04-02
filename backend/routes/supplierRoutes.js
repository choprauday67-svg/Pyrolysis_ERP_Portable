const express = require('express');
const router = express.Router();

const {
  getSuppliers,
  createSupplier,
  deleteSupplier
} = require('../controllers/supplierController');
const { protect, admin } = require('../middleware/auth');

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.delete('/:id', protect, admin, deleteSupplier);

module.exports = router;