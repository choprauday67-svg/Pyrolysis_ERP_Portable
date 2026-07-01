/**
 * financialService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for all financial calculations in the Pyrolysis ERP.
 *
 * DECISION — Revenue source:
 *   Revenue = SUM(invoices.total_amount) WHERE payment_status != 'Draft'
 *
 *   Rationale:
 *     • The `invoices` table holds formal GST-billed transactions with verified
 *       amounts (taxable + CGST + SGST + IGST = total_amount).
 *     • The `sales` table holds informal dispatch / quantity records that are NOT
 *       necessarily billed or collected; they are used for stock-level tracking.
 *     • Summing BOTH caused a double-count of ₹16,53,522 in the old Dashboard,
 *       inflating revenue from ₹14,27,650 (Analytics) to ₹30,81,172 (Dashboard).
 *     • Draft invoices are excluded because they represent pending/unconfirmed sales.
 *
 * DECISION — Profit calculation:
 *   Profit = Revenue − TotalExpenses  (operational net profit)
 *   Margin = (Profit / Revenue) × 100
 *
 *   Rationale:
 *     • `expenses` table tracks all operational costs (fuel, labour, maintenance).
 *     • This gives an accurate net profit view consistent across Dashboard and Analytics.
 *
 * DECISION — Inventory (current stock):
 *   Stock[commodity] = TotalProduced(batches, Completed) − TotalSold(sales)
 *   Stock[tyres]     = TotalReceived(inventory.weight) − TotalConsumed(batches)
 *
 * All modules MUST import from this service. Never duplicate these queries.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const db = require('../config/db');

// ── Per-product estimated production cost (₹/unit) ────────────────────────────
// Used by the Commodity Margins Analytics page to estimate gross margins per product.
// This is NOT used in the top-level Revenue / Profit / Margin KPIs.
const PRODUCTION_COST_PER_UNIT = {
  'Oil':             28,   // ₹28/litre  (sells at ~₹42–46 → ~35% margin)
  'Carbon Black':    18,   // ₹18/kg     (sells at ~₹28–29 → ~37% margin)
  'Steel Wire':      22,   // ₹22/kg     (sells at ~₹35–36 → ~38% margin)
  'Steel':           22,   // ₹22/kg
  'Gas':              8,   // ₹8/unit    (sells at ~₹12 → ~33% margin)
  'Energy Recovery':  7    // ₹7/unit
};
const DEFAULT_UNIT_COST = 25;

// ── Core financial snapshot ────────────────────────────────────────────────────
/**
 * Returns the authoritative financial KPIs used across ALL modules:
 *   { revenue, totalExpenses, netProfit, marginPct }
 *
 * Revenue source: SUM(invoices.total_amount) WHERE payment_status != 'Draft'
 */
async function getFinancialSnapshot() {
  const [revRows] = await db.execute(
    "SELECT COALESCE(SUM(total_amount), 0) AS revenue FROM invoices WHERE payment_status != 'Draft'"
  );
  const [expRows] = await db.execute(
    'SELECT COALESCE(SUM(amount), 0) AS totalExpenses FROM expenses'
  );

  const revenue       = Number(revRows[0].revenue       || 0);
  const totalExpenses = Number(expRows[0].totalExpenses  || 0);
  const netProfit     = revenue - totalExpenses;
  const marginPct     = revenue > 0
    ? Number(((netProfit / revenue) * 100).toFixed(2))
    : 0;

  return { revenue, totalExpenses, netProfit, marginPct };
}

/**
 * Returns financial KPIs for a specific month (YYYY-MM).
 */
async function getMonthlyFinancialSnapshot(month) {
  const [revRows] = await db.execute(
    "SELECT COALESCE(SUM(total_amount), 0) AS revenue FROM invoices WHERE payment_status != 'Draft' AND strftime('%Y-%m', invoice_date) = ?",
    [month]
  );
  const [expRows] = await db.execute(
    "SELECT COALESCE(SUM(amount), 0) AS totalExpenses FROM expenses WHERE strftime('%Y-%m', date) = ?",
    [month]
  );

  const revenue       = Number(revRows[0].revenue       || 0);
  const totalExpenses = Number(expRows[0].totalExpenses  || 0);
  const netProfit     = revenue - totalExpenses;
  const marginPct     = revenue > 0
    ? Number(((netProfit / revenue) * 100).toFixed(2))
    : 0;

  return { revenue, totalExpenses, netProfit, marginPct };
}

/**
 * Returns estimated production cost from sales dispatch records for a specific month.
 */
async function getMonthlyEstimatedProductionCost(month) {
  const [salesRows] = await db.execute(
    "SELECT product_type, SUM(quantity) as qty FROM sales WHERE strftime('%Y-%m', date) = ?",
    [month]
  );
  let estimatedCost = 0;
  salesRows.forEach(row => {
    const unitCost = PRODUCTION_COST_PER_UNIT[row.product_type] ?? DEFAULT_UNIT_COST;
    estimatedCost += Number(row.qty || 0) * unitCost;
  });
  return estimatedCost;
}


// ── Commodity-level analytics (for Analytics / Margins page) ─────────────────
/**
 * Returns per-product sales analytics including revenue, estimated cost, profit,
 * and margin percentage.  Revenue here comes from the `sales` table
 * (quantity × price_per_unit) because the Analytics page shows per-commodity
 * breakdown which is not available from the invoices table.
 *
 * IMPORTANT: This is distinct from the top-level Revenue KPI (which uses invoices).
 * The totals returned here MUST NOT be used as the dashboard revenue figure.
 */
async function getCommodityMargins() {
  const [salesRows] = await db.execute('SELECT * FROM sales ORDER BY date DESC');

  const grouped = {};
  salesRows.forEach(sale => {
    const type    = sale.product_type || 'Unknown';
    const qty     = Number(sale.quantity          || 0);
    const revenue = qty * Number(sale.price_per_unit || 0);

    if (!grouped[type]) {
      grouped[type] = { product: type, quantity: 0, revenue: 0 };
    }
    grouped[type].quantity += qty;
    grouped[type].revenue  += revenue;
  });

  const products = Object.values(grouped).map(item => {
    const unitCost      = PRODUCTION_COST_PER_UNIT[item.product] ?? DEFAULT_UNIT_COST;
    const estimatedCost = item.quantity * unitCost;
    const profit        = item.revenue - estimatedCost;
    const profitPct     = item.revenue > 0
      ? Number(((profit / item.revenue) * 100).toFixed(2))
      : 0;
    return {
      product:           item.product,
      quantity:          Number(item.quantity.toFixed(2)),
      revenue:           Number(item.revenue.toFixed(2)),
      estimated_cost:    Number(estimatedCost.toFixed(2)),
      profit:            Number(profit.toFixed(2)),
      profit_percentage: profitPct
    };
  });

  return products;
}

/**
 * Returns a detailed reconciliation between sales dispatch records and official GST invoices.
 */
async function getRevenueReconciliation() {
  const [revRows] = await db.execute("SELECT COALESCE(SUM(total_amount), 0) AS invoice_total, COALESCE(SUM(taxable_amount), 0) AS invoice_taxable, COALESCE(SUM(cgst + sgst + igst), 0) AS gst_collected FROM invoices WHERE payment_status != 'Draft'");
  const [salesRows] = await db.execute("SELECT COALESCE(SUM(quantity * price_per_unit), 0) AS dispatch_revenue FROM sales");

  const dispatchRevenue = Number(salesRows[0].dispatch_revenue || 0);
  const invoiceTaxable = Number(revRows[0].invoice_taxable || 0);
  const invoiceTotal = Number(revRows[0].invoice_total || 0);
  const gstCollected = Number(revRows[0].gst_collected || 0);
  const uninvoicedDispatchValue = Math.max(0, dispatchRevenue - invoiceTaxable);

  return {
    dispatchRevenue,
    uninvoicedDispatchValue,
    invoiceTaxable,
    gstCollected,
    invoiceTotal
  };
}

// ── Batch production summary ───────────────────────────────────────────────────
/**
 * Returns aggregated production totals from all completed batches.
 */
async function getProductionSummary() {
  const [rows] = await db.execute(`
    SELECT
      COALESCE(SUM(oil_output),    0) AS total_oil,
      COALESCE(SUM(carbon_output), 0) AS total_carbon,
      COALESCE(SUM(steel_output),  0) AS total_steel,
      COALESCE(SUM(gas_output),    0) AS total_gas,
      COALESCE(SUM(input_tyres),   0) AS total_input,
      COUNT(*)                         AS batch_count,
      AVG(CASE WHEN input_tyres > 0 THEN (oil_output / input_tyres) * 100 ELSE 0 END) AS avg_efficiency
    FROM batches WHERE status = 'Completed'
  `);
  return rows[0];
}

module.exports = {
  getFinancialSnapshot,
  getMonthlyFinancialSnapshot,
  getMonthlyEstimatedProductionCost,
  getCommodityMargins,
  getProductionSummary,
  getRevenueReconciliation,
  PRODUCTION_COST_PER_UNIT,
  DEFAULT_UNIT_COST
};
