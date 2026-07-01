'use strict';

/**
 * analyticsController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Commodity Margins Analytics endpoint.
 *
 * KPI alignment with Dashboard:
 *  • total_revenue   → financialService.getFinancialSnapshot() [invoices, non-Draft]
 *  • total_expenses  → same snapshot (SUM expenses)
 *  • net_profit      → revenue − expenses
 *  • total_margin    → (net_profit / revenue) × 100
 *
 * Per-product breakdown (revenue, estimated cost, margin):
 *  → financialService.getCommodityMargins() [sales table, qty × price]
 *    This is kept separate because the invoices table does not have product-level
 *    line items that can be broken down by commodity type.  The per-commodity
 *    margin figures are labelled clearly as "Sales Dispatch Revenue" to distinguish
 *    them from the invoice-based top-level KPIs.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Batch = require('../models/batchModel');
const financialService = require('../services/financialService');

exports.getProfitAnalytics = async (req, res) => {
  try {
    // ── Top-level KPIs from single source of truth ─────────────────────────
    const snapshot     = await financialService.getFinancialSnapshot();
    const batchSummary = await Batch.getSummary();

    // ── Per-product commodity margins (from sales dispatch records) ────────
    const products     = await financialService.getCommodityMargins();
    
    // ── Revenue Reconciliation ─────────────────────────────────────────────
    const reconciliation = await financialService.getRevenueReconciliation();

    // Summary of commodity-level figures (informational, not the top KPIs)
    const salesRevTotal  = products.reduce((s, p) => s + p.revenue, 0);
    const salesCostTotal = products.reduce((s, p) => s + p.estimated_cost, 0);
    const salesProfitTotal = products.reduce((s, p) => s + p.profit, 0);
    const salesMargin    = salesRevTotal > 0
      ? Number(((salesProfitTotal / salesRevTotal) * 100).toFixed(2))
      : 0;

    // ── Top / Bottom performers ────────────────────────────────────────────
    const sortedByProfit       = [...products].sort((a, b) => b.profit - a.profit);
    const highestProfitProduct = sortedByProfit[0]   || null;
    const lowestProfitProduct  = sortedByProfit[sortedByProfit.length - 1] || null;

    // ── Revenue contribution (as % of sales dispatch revenue) ─────────────
    const revenueContribution = products.map(item => ({
      product:      item.product,
      revenue:      item.revenue,
      contribution: salesRevTotal > 0
        ? Number(((item.revenue / salesRevTotal) * 100).toFixed(2))
        : 0
    }));

    res.json({
      success: true,
      metrics: {
        // ── Primary KPIs — must match Dashboard exactly ──────────────────
        total_revenue:  Number(snapshot.revenue.toFixed(2)),
        total_expenses: Number(snapshot.totalExpenses.toFixed(2)),
        total_profit:   Number(snapshot.netProfit.toFixed(2)),
        total_margin:   snapshot.marginPct,

        // ── Commodity-level breakdown (from sales dispatch records) ──────
        // These are labelled separately so the UI can display both:
        //   "Invoiced Revenue" (top KPI) vs "Sales Dispatch Revenue" (per-product)
        sales_dispatch_revenue: Number(salesRevTotal.toFixed(2)),
        sales_dispatch_cost:    Number(salesCostTotal.toFixed(2)),
        sales_dispatch_profit:  Number(salesProfitTotal.toFixed(2)),
        sales_dispatch_margin:  salesMargin,

        products_count: products.length,
        batch_production: {
          oil:    Number(batchSummary.total_oil    || 0),
          carbon: Number(batchSummary.total_carbon || 0),
          steel:  Number(batchSummary.total_steel  || 0),
          gas:    Number(batchSummary.total_gas    || 0)
        }
      },
      products,
      highestProfitProduct,
      lowestProfitProduct,
      revenueContribution,
      reconciliation
    });
  } catch (err) {
    console.error('Profit analytics error:', err);
    res.status(500).json({ success: false, message: 'Unable to calculate profit analytics' });
  }
};
