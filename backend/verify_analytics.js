/**
 * verify_analytics.js — Audit analytics calculations against raw DB
 * Run: node verify_analytics.js
 */
const db = require('./config/db');

const costByProduct = {
  'Oil':            28,
  'Carbon Black':   18,
  'Steel Wire':     22,
  'Steel':          22,
  'Gas':             8,
  'Energy Recovery': 7
};
const DEFAULT_UNIT_COST = 25;

const fmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function run() {
  console.log('\n======================================================');
  console.log('  ANALYTICS CALCULATION VERIFICATION REPORT');
  console.log('======================================================\n');

  // 1. Raw sales records
  const [sales] = await db.execute('SELECT * FROM sales ORDER BY product_type, date');
  console.log('--- STEP 1: RAW SALES TABLE ---');
  console.log('Total records:', sales.length);
  console.log('');
  sales.forEach(r => {
    const lineTotal = Number(r.quantity) * Number(r.price_per_unit);
    console.log(`  [${r.date}] ${r.product_type.padEnd(14)} qty=${String(r.quantity).padStart(7)}  @₹${String(r.price_per_unit).padStart(6)}/unit  = ₹${fmt(lineTotal)}`);
  });

  // 2. Manual aggregation
  console.log('\n--- STEP 2: AGGREGATION BY PRODUCT (manual) ---');
  const grouped = {};
  sales.forEach(r => {
    const pt  = r.product_type;
    const qty = Number(r.quantity);
    const rev = qty * Number(r.price_per_unit);
    if (!grouped[pt]) grouped[pt] = { qty: 0, revenue: 0, records: 0 };
    grouped[pt].qty     += qty;
    grouped[pt].revenue += rev;
    grouped[pt].records++;
  });

  let totalRev = 0, totalCost = 0, totalProfit = 0;
  Object.entries(grouped).forEach(([pt, d]) => {
    const unitCost = costByProduct[pt] ?? DEFAULT_UNIT_COST;
    const cost     = d.qty * unitCost;
    const profit   = d.revenue - cost;
    const margin   = d.revenue > 0 ? ((profit / d.revenue) * 100).toFixed(2) : '0.00';
    totalRev    += d.revenue;
    totalCost   += cost;
    totalProfit += profit;
    console.log(`\n  Product      : ${pt}`);
    console.log(`  Records      : ${d.records} sales entries`);
    console.log(`  Total Qty    : ${fmt(d.qty)}`);
    console.log(`  Total Revenue: ₹${fmt(d.revenue)}`);
    console.log(`  Unit Cost    : ₹${unitCost} (key "${pt}" → ${costByProduct[pt] !== undefined ? 'FOUND' : 'MISSING → default ₹'+DEFAULT_UNIT_COST})`);
    console.log(`  Est. Cost    : ₹${fmt(cost)}  (${fmt(d.qty)} × ₹${unitCost})`);
    console.log(`  Profit       : ₹${fmt(profit)}`);
    console.log(`  Margin       : ${margin}%`);
  });

  const totalMargin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(2) : '0.00';
  console.log('\n--- STEP 3: TOTALS ---');
  console.log(`  Total Revenue : ₹${fmt(totalRev)}`);
  console.log(`  Total Cost    : ₹${fmt(totalCost)}`);
  console.log(`  Total Profit  : ₹${fmt(totalProfit)}`);
  console.log(`  Total Margin  : ${totalMargin}%`);

  // 3. Expenses
  const [expRows] = await db.execute('SELECT type, SUM(amount) as total FROM expenses GROUP BY type ORDER BY total DESC');
  const [expTotal] = await db.execute('SELECT COALESCE(SUM(amount),0) as grand FROM expenses');
  console.log('\n--- STEP 4: EXPENSES TABLE ---');
  expRows.forEach(r => console.log(`  ${r.type.padEnd(14)}: ₹${fmt(r.total)}`));
  console.log(`  ${'GRAND TOTAL'.padEnd(14)}: ₹${fmt(expTotal[0].grand)}`);

  // 4. DB-side SQL check
  const [sqlAgg] = await db.execute(
    'SELECT product_type, COUNT(*) as cnt, SUM(quantity) as qty, SUM(quantity*price_per_unit) as rev FROM sales GROUP BY product_type'
  );
  console.log('\n--- STEP 5: DB SQL AGGREGATION (cross-check) ---');
  sqlAgg.forEach(r => {
    console.log(`  ${r.product_type.padEnd(14)} cnt=${r.cnt}  qty=${fmt(r.qty)}  revenue=₹${fmt(r.rev)}`);
  });

  // 5. Check for any product_type values not in costByProduct
  console.log('\n--- STEP 6: KEY MAPPING CHECK ---');
  const dbProductTypes = [...new Set(sales.map(r => r.product_type))];
  dbProductTypes.forEach(pt => {
    const found = costByProduct[pt] !== undefined;
    console.log(`  "${pt}" → ${found ? '✅ FOUND (₹'+costByProduct[pt]+'/unit)' : '❌ MISSING → fallback ₹'+DEFAULT_UNIT_COST}`);
  });

  // 6. Sorted by profit
  console.log('\n--- STEP 7: PRODUCTS SORTED BY PROFIT ---');
  const sorted = Object.entries(grouped).map(([pt, d]) => {
    const unitCost = costByProduct[pt] ?? DEFAULT_UNIT_COST;
    const cost     = d.qty * unitCost;
    const profit   = d.revenue - cost;
    return { product: pt, profit };
  }).sort((a, b) => b.profit - a.profit);
  sorted.forEach((p, i) => console.log(`  ${i+1}. ${p.product.padEnd(14)} Profit=₹${fmt(p.profit)}`));
  console.log(`\n  → Top Profit Product   : ${sorted[0].product} (₹${fmt(sorted[0].profit)})`);
  console.log(`  → Lowest Profit Product: ${sorted[sorted.length-1].product} (₹${fmt(sorted[sorted.length-1].profit)})`);

  console.log('\n======================================================\n');
  process.exit(0);
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
