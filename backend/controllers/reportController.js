const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../config/db');
const Expense = require('../models/expenseModel');
const Invoice = require('../models/invoiceModel');
const Sales = require('../models/salesModel');
const Batch = require('../models/batchModel');
const financialService = require('../services/financialService');

const formatCurrency = (value) => `₹ ${Number(value || 0).toFixed(2)}`;

const parseDateInput = (value) => {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
};

exports.getDailyProductionReport = async (req, res) => {
  try {
    const dateFilter = parseDateInput(req.query.date) || new Date().toISOString().slice(0, 10);
    const [rows] = await db.execute(
      `SELECT * FROM batches WHERE date(date) = ? ORDER BY date DESC`,
      [dateFilter]
    );

    res.json({ success: true, report: rows, date: dateFilter });
  } catch (err) {
    console.error('Daily production report error:', err);
    res.status(500).json({ success: false, message: 'Unable to fetch daily production report' });
  }
};

// Production cost per unit — defined centrally in financialService
const { PRODUCTION_COST_PER_UNIT: costByProduct, DEFAULT_UNIT_COST } = financialService;

exports.getMonthlyProfitReport = async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    // Get the authoritative financial snapshot for the month
    const financials = await financialService.getMonthlyFinancialSnapshot(month);
    const revenue = financials.revenue;
    const expense = financials.totalExpenses;
    const profit = financials.netProfit;
    const profit_percentage = financials.marginPct;

    // Estimated production cost (from sales dispatch records, for informational per-product breakdown)
    const estimatedCost = await financialService.getMonthlyEstimatedProductionCost(month);

    res.json({
      success: true,
      month,
      revenue,                         // Invoice-based revenue (matches Dashboard)
      expense,                         // Actual operational expenses for the month
      estimated_cost: estimatedCost,   // Est. production cost from dispatch records (informational)
      profit,
      profit_percentage: revenue ? Number(((profit / revenue) * 100).toFixed(2)) : 0
    });
  } catch (err) {
    console.error('Monthly profit report error:', err);
    res.status(500).json({ success: false, message: 'Unable to fetch monthly profit report' });
  }
};

exports.getProductRevenueReport = async (req, res) => {
  try {
    const productType = req.query.product_type || null;
    const monthLabel = req.query.month || null;
    const filters = [];
    const params = [];

    if (productType) {
      filters.push('product_type = ?');
      params.push(productType);
    }
    if (monthLabel) {
      filters.push("strftime('%Y-%m', date) = ?");
      params.push(monthLabel);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await db.execute(
      `SELECT product_type, SUM(quantity) as quantity, SUM(quantity * price_per_unit) as revenue
       FROM sales ${where}
       GROUP BY product_type
       ORDER BY revenue DESC`,
      params
    );

    res.json({ success: true, report: rows, filter: { product_type: productType, month: monthLabel } });
  } catch (err) {
    console.error('Product revenue report error:', err);
    res.status(500).json({ success: false, message: 'Unable to fetch product revenue report' });
  }
};

exports.getExpenseReport = async (req, res) => {
  try {
    const from = parseDateInput(req.query.from) || '1970-01-01';
    const to = parseDateInput(req.query.to) || new Date().toISOString().slice(0, 10);
    const [rows] = await db.execute(
      `SELECT * FROM expenses WHERE date(date) BETWEEN ? AND ? ORDER BY date DESC`,
      [from, to]
    );
    res.json({ success: true, report: rows, range: { from, to } });
  } catch (err) {
    console.error('Expense report error:', err);
    res.status(500).json({ success: false, message: 'Unable to fetch expense report' });
  }
};

exports.getGstSalesReport = async (req, res) => {
  try {
    const from = parseDateInput(req.query.from) || '1970-01-01';
    const to = parseDateInput(req.query.to) || new Date().toISOString().slice(0, 10);
    const report = await Invoice.getSalesGstSummary(from, to);
    res.json({ success: true, report, range: { from, to } });
  } catch (err) {
    console.error('GST sales report error:', err);
    res.status(500).json({ success: false, message: 'Unable to fetch GST sales report' });
  }
};

exports.exportDailyProductionCsv = async (req, res) => {
  try {
    const dateFilter = parseDateInput(req.query.date) || new Date().toISOString().slice(0, 10);
    const [rows] = await db.execute('SELECT * FROM batches WHERE date(date) = ? ORDER BY date DESC', [dateFilter]);

    const header = ['Batch', 'Input Tyres', 'Oil Output', 'Carbon Output', 'Steel Output', 'Gas Output', 'Status', 'Date'];
    const csvData = [header.join(',')].concat(rows.map((row) => [
      row.batch_number,
      row.input_tyres,
      row.oil_output,
      row.carbon_output,
      row.steel_output,
      row.gas_output,
      row.status,
      row.date
    ].map(String).join(',')));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="daily_production_${dateFilter}.csv"`);
    res.send(csvData.join('\n'));
  } catch (err) {
    console.error('Export daily production CSV error:', err);
    res.status(500).json({ success: false, message: 'Unable to export daily production CSV' });
  }
};

exports.exportMonthlyProfitExcel = async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    // Get the authoritative financial snapshot for the month
    const financials = await financialService.getMonthlyFinancialSnapshot(month);
    const revenue = financials.revenue;
    const expense = financials.totalExpenses;
    const profit = financials.netProfit;

    // Estimated production cost (informational, from dispatch records)
    const estimatedCost = await financialService.getMonthlyEstimatedProductionCost(month);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Monthly Profit');

    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 18 }
    ];

    sheet.addRow({ metric: 'Month', value: month });
    sheet.addRow({ metric: 'Revenue (Invoices, non-Draft)', value: revenue });
    sheet.addRow({ metric: 'Operational Expenses', value: expense });
    sheet.addRow({ metric: 'Est. Production Cost (Dispatch)', value: estimatedCost });
    sheet.addRow({ metric: 'Net Profit (Revenue - Expenses)', value: profit });
    sheet.addRow({ metric: 'Net Margin %', value: revenue ? `${((profit / revenue) * 100).toFixed(2)}%` : '0.00%' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="monthly_profit_${month}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export monthly profit Excel error:', err);
    res.status(500).json({ success: false, message: 'Unable to export monthly profit Excel' });
  }
};

exports.exportGstSalesPdf = async (req, res) => {
  try {
    const from = parseDateInput(req.query.from) || '1970-01-01';
    const to = parseDateInput(req.query.to) || new Date().toISOString().slice(0, 10);
    const report = await Invoice.getSalesGstSummary(from, to);
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    // ── Company Branding Header ──────────────────────────────────────────
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#2c3e50').text('HARIT MANGAL INDUSTRIES', { align: 'left' });
    doc.fontSize(9).font('Helvetica').fillColor('#7f8c8d').text('Sustainable Energy & Pyrolysis Solutions', { align: 'left' });
    doc.moveDown(0.5);

    const addressX = doc.x;
    const addressY = doc.y;
    doc.fontSize(8).fillColor('#34495e');
    doc.text('123 Industrial Area, Phase II', addressX, addressY);
    doc.text('New Delhi, Delhi 110020, India');
    doc.text('GSTIN: 07AAACH7400M1ZZ');
    
    // Report Title
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#2c3e50').text('GST SALES REPORT', 40, addressY, { align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#7f8c8d').text(`Range: ${from} to ${to}`, 40, doc.y, { align: 'right' });
    doc.moveDown(2);

    const headers = ['Invoice', 'Date', 'Customer', 'GSTIN', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total', 'Status'];
    const columnWidths = [50, 45, 85, 85, 45, 35, 35, 35, 50, 45];
    
    // Table Header Background
    const tableTop = doc.y;
    doc.rect(40, tableTop - 5, 515, 20).fill('#ecf0f1');

    let x = 40;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#2c3e50');
    headers.forEach((header, idx) => {
      doc.text(header, x, tableTop, { width: columnWidths[idx] });
      x += columnWidths[idx];
    });
    doc.moveDown(1);
    doc.font('Helvetica').fillColor('#000');

    report.forEach((row) => {
      let rowX = 40;
      const rowY = doc.y;
      doc.text(row.invoice_number, rowX, rowY, { width: columnWidths[0] }); rowX += columnWidths[0];
      doc.text(row.invoice_date, rowX, rowY, { width: columnWidths[1] }); rowX += columnWidths[1];
      doc.text(row.customer_name, rowX, rowY, { width: columnWidths[2] }); rowX += columnWidths[2];
      doc.text(row.gst_number, rowX, rowY, { width: columnWidths[3] }); rowX += columnWidths[3];
      doc.text(formatCurrency(row.taxable_amount), rowX, rowY, { width: columnWidths[4] }); rowX += columnWidths[4];
      doc.text(formatCurrency(row.cgst), rowX, rowY, { width: columnWidths[5] }); rowX += columnWidths[5];
      doc.text(formatCurrency(row.sgst), rowX, rowY, { width: columnWidths[6] }); rowX += columnWidths[6];
      doc.text(formatCurrency(row.igst), rowX, rowY, { width: columnWidths[7] }); rowX += columnWidths[7];
      doc.text(formatCurrency(row.total_amount), rowX, rowY, { width: columnWidths[8] }); rowX += columnWidths[8];
      doc.text(row.payment_status, rowX, rowY, { width: columnWidths[9] });
      
      // Handle pagination if row is too low
      if (doc.y > 750) { doc.addPage(); doc.y = 40; } else { doc.moveDown(0.5); }
    });

    doc.moveDown(2);
    doc.fontSize(9).font('Helvetica').fillColor('#7f8c8d').text('This is a computer-generated report and does not require a physical signature.', 40, doc.y, { align: 'center' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="gst_sales_${from}_to_${to}.pdf"`);
    doc.pipe(res);
    doc.end();
  } catch (err) {
    console.error('Export GST sales PDF error:', err);
    res.status(500).json({ success: false, message: 'Unable to export GST sales report PDF' });
  }
};
