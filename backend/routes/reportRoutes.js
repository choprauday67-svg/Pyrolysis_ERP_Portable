const express = require('express');
const router = express.Router();
const {
  getDailyProductionReport,
  getMonthlyProfitReport,
  getProductRevenueReport,
  getExpenseReport,
  getGstSalesReport,
  exportDailyProductionCsv,
  exportMonthlyProfitExcel,
  exportGstSalesPdf
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.get('/daily-production', protect, getDailyProductionReport);
router.get('/monthly-profit', protect, getMonthlyProfitReport);
router.get('/product-revenue', protect, getProductRevenueReport);
router.get('/expenses', protect, getExpenseReport);
router.get('/gst-sales', protect, getGstSalesReport);

router.get('/daily-production/export/csv', protect, exportDailyProductionCsv);
router.get('/monthly-profit/export/excel', protect, exportMonthlyProfitExcel);
router.get('/gst-sales/export/pdf', protect, exportGstSalesPdf);

module.exports = router;
