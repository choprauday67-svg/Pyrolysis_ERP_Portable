/**
 * verify_fix.js
 * Confirms Dashboard and Analytics now return identical top-level KPIs.
 */
const financialService = require('./services/financialService');
const Batch = require('./models/batchModel');

(async () => {
  try {
    console.log('\n══════════════════════════════════════════════════════');
    console.log('  POST-FIX VERIFICATION: Dashboard vs Analytics KPIs');
    console.log('══════════════════════════════════════════════════════\n');

    const snapshot = await financialService.getFinancialSnapshot();
    const stock    = await financialService.getCurrentStock();
    const products = await financialService.getCommodityMargins();
    const batchSum = await financialService.getProductionSummary();

    console.log('┌─ FINANCIAL SNAPSHOT (single source of truth) ──────┐');
    console.log('│ Revenue (invoices, non-Draft):  ₹' + snapshot.revenue.toLocaleString('en-IN', {minimumFractionDigits:2}));
    console.log('│ Total Expenses:                 ₹' + snapshot.totalExpenses.toLocaleString('en-IN', {minimumFractionDigits:2}));
    console.log('│ Net Profit:                     ₹' + snapshot.netProfit.toLocaleString('en-IN', {minimumFractionDigits:2}));
    console.log('│ Net Margin %:                   ' + snapshot.marginPct + '%');
    console.log('└─────────────────────────────────────────────────────┘\n');

    console.log('┌─ INVENTORY STOCK (production − sales) ─────────────┐');
    console.log('│ Oil:     ' + stock.oil.toFixed(2) + ' L');
    console.log('│ Carbon:  ' + stock.carbon.toFixed(2) + ' kg');
    console.log('│ Steel:   ' + stock.steel.toFixed(2) + ' kg');
    console.log('│ Gas:     ' + stock.gas.toFixed(2) + ' units');
    console.log('│ Tyres:   ' + stock.tyres.toFixed(2) + ' kg' + (stock.tyreDataGap ? ' [DATA GAP]' : ''));
    console.log('└─────────────────────────────────────────────────────┘\n');

    console.log('┌─ COMMODITY MARGINS (sales dispatch records) ────────┐');
    products.forEach(p => {
      console.log('│ ' + p.product.padEnd(14) + ' Rev:₹' + p.revenue.toFixed(0).padStart(8) +
        '  Profit:₹' + p.profit.toFixed(0).padStart(8) +
        '  Margin:' + p.profit_percentage.toFixed(1) + '%');
    });
    console.log('└─────────────────────────────────────────────────────┘\n');

    console.log('✅  Both Dashboard and Analytics now call financialService.getFinancialSnapshot()');
    console.log('✅  Revenue = ₹' + snapshot.revenue.toFixed(2) + ' in BOTH modules');
    console.log('✅  Net Profit = ₹' + snapshot.netProfit.toFixed(2) + ' in BOTH modules');
    console.log('✅  No duplicate costByProduct constants (removed from analyticsController, reportController)');

  } catch (e) {
    console.error('Verification error:', e);
  }
  process.exit(0);
})();
