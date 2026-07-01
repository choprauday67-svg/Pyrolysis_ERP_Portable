/**
 * cleanup_sales_duplicates.js
 * Removes duplicate / legacy sales records and shows before/after numbers.
 * Run: node cleanup_sales_duplicates.js
 */
const db = require('./config/db');

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function run() {
  console.log('\n======================================================');
  console.log('  SALES DATA CLEANUP — BEFORE / AFTER');
  console.log('======================================================\n');

  // ── BEFORE ───────────────────────────────────────────────────────
  const [before] = await db.execute(
    'SELECT COUNT(*) as cnt, SUM(quantity*price_per_unit) as rev FROM sales'
  );
  console.log(`BEFORE → ${before[0].cnt} records, total revenue = ₹${fmt(before[0].rev)}\n`);

  const [allBefore] = await db.execute(
    'SELECT id, product_type, quantity, price_per_unit, buyer, date FROM sales ORDER BY id'
  );
  allBefore.forEach(r => {
    const flag = Number(r.price_per_unit) < 1 ? ' ← LEGACY PRICE' :
                 String(r.date).startsWith('2006') ? ' ← WRONG YEAR' : '';
    console.log(`  id=${String(r.id).padStart(3)}  ${r.product_type.padEnd(14)} qty=${String(r.quantity).padStart(5)} @₹${String(r.price_per_unit).padStart(5)}  ${r.date}  ${r.buyer}${flag}`);
  });

  // ── STEP 1: Delete legacy low-price records (price < 1) ─────────
  console.log('\n--- Removing legacy low-price records (price_per_unit < 1) ---');
  const [legacyRows] = await db.execute('SELECT id FROM sales WHERE price_per_unit < 1');
  if (legacyRows.length) {
    const legacyIds = legacyRows.map(r => r.id);
    console.log(`  Deleting IDs: ${legacyIds.join(', ')}`);
    await db.execute(`DELETE FROM sales WHERE id IN (${legacyIds.join(',')})`);
  } else {
    console.log('  None found.');
  }

  // ── STEP 2: Delete wrong-year records ───────────────────────────
  console.log('\n--- Removing wrong-year records (date < 2020) ---');
  const [wrongYear] = await db.execute("SELECT id FROM sales WHERE date < '2020-01-01'");
  if (wrongYear.length) {
    const ids = wrongYear.map(r => r.id);
    console.log(`  Deleting IDs: ${ids.join(', ')}`);
    await db.execute(`DELETE FROM sales WHERE id IN (${ids.join(',')})`);
  } else {
    console.log('  None found.');
  }

  // ── STEP 3: Remove exact duplicates (keep MIN id per group) ──────
  console.log('\n--- Removing duplicate records (keeping MIN id per product+qty+price+buyer+date) ---');
  const [dupeIds] = await db.execute(`
    SELECT id FROM sales
    WHERE id NOT IN (
      SELECT MIN(id) FROM sales
      GROUP BY product_type, quantity, price_per_unit, buyer, date
    )
  `);
  if (dupeIds.length) {
    const ids = dupeIds.map(r => r.id);
    console.log(`  Deleting ${ids.length} duplicate IDs: ${ids.join(', ')}`);
    await db.execute(`DELETE FROM sales WHERE id IN (${ids.join(',')})`);
  } else {
    console.log('  No duplicates found.');
  }

  // ── AFTER ────────────────────────────────────────────────────────
  console.log('\n======================================================');
  const [after] = await db.execute(
    'SELECT COUNT(*) as cnt, SUM(quantity*price_per_unit) as rev FROM sales'
  );
  console.log(`AFTER → ${after[0].cnt} records, total revenue = ₹${fmt(after[0].rev)}\n`);

  const [allAfter] = await db.execute(
    'SELECT id, product_type, quantity, price_per_unit, buyer, date FROM sales ORDER BY product_type, date'
  );
  allAfter.forEach(r => {
    const lineRev = Number(r.quantity) * Number(r.price_per_unit);
    console.log(`  id=${String(r.id).padStart(3)}  ${r.product_type.padEnd(14)} qty=${String(r.quantity).padStart(5)} @₹${String(r.price_per_unit).padStart(5)}  = ₹${fmt(lineRev)}`);
  });

  // ── Final numbers (what analytics should now show) ────────────────
  const costByProduct = { 'Oil': 28, 'Carbon Black': 18, 'Steel Wire': 22, 'Steel': 22, 'Gas': 8 };
  console.log('\n--- EXPECTED ANALYTICS OUTPUT AFTER CLEANUP ---');

  const [agg] = await db.execute(
    'SELECT product_type, SUM(quantity) as qty, SUM(quantity*price_per_unit) as rev FROM sales GROUP BY product_type ORDER BY rev DESC'
  );
  let totalRev = 0, totalCost = 0, totalProfit = 0;
  agg.forEach(r => {
    const unitCost = costByProduct[r.product_type] || 25;
    const cost   = Number(r.qty) * unitCost;
    const profit = Number(r.rev) - cost;
    const margin = Number(r.rev) > 0 ? ((profit / Number(r.rev)) * 100).toFixed(2) : '0.00';
    totalRev    += Number(r.rev);
    totalCost   += cost;
    totalProfit += profit;
    console.log(`\n  ${r.product_type}`);
    console.log(`    Revenue : ₹${fmt(r.rev)}  (qty ${fmt(r.qty)} × avg ₹${(Number(r.rev)/Number(r.qty)).toFixed(2)})`);
    console.log(`    Cost    : ₹${fmt(cost)}  (qty ${fmt(r.qty)} × ₹${unitCost}/unit)`);
    console.log(`    Profit  : ₹${fmt(profit)}`);
    console.log(`    Margin  : ${margin}%`);
  });

  const totalMargin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(2) : '0.00';
  console.log('\n  ── TOTALS ──');
  console.log(`  Revenue : ₹${fmt(totalRev)}`);
  console.log(`  Cost    : ₹${fmt(totalCost)}`);
  console.log(`  Profit  : ₹${fmt(totalProfit)}`);
  console.log(`  Margin  : ${totalMargin}%`);
  console.log('\n======================================================\n');

  process.exit(0);
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
