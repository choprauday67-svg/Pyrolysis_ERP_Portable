const express = require('express');
const router = express.Router();
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  downloadInvoicePdf,
  getInvoicePreview
} = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAllInvoices);
router.get('/:id', protect, getInvoiceById);
router.get('/:id/preview', protect, getInvoicePreview);
router.get('/:id/pdf', protect, downloadInvoicePdf);
router.post('/', protect, createInvoice);
router.put('/:id', protect, updateInvoice);
router.delete('/:id', protect, deleteInvoice);

module.exports = router;
