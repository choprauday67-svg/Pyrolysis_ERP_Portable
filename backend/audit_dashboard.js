const db = require('./config/db');

async function run() {
  // 1. Inventory (Tyres in Hand)
  const [inv] = await db.execute('SELECT SUM(weight) as total_in FROM inventory');
  const [batchUsed] = await db.execute("SELECT SUM(input_tyres) as total_used FROM batches WHERE status IN ('In-Progress', 'Completed')");
  const tyresInHand = parseFloat(inv[0].total_in || 0) - parseFloat(batchUsed[0].total_used || 0);

  // 2. Batch production summary (Completed only)
  const [batchSum] = await db.execute(
    `SELECT SUM(oil_output) as total_oil, SUM(carbon_output) as total_carbon,
            SUM(steel_output) as total_steel, SUM(gas_output) as total_gas,
            SUM(input_tyres) as total_input,
            COUNT(*) as batch_count,
            AVG(CASE WHEN input_tyres > 0 THEN (oil_output/input_tyres)*100 ELSE 0 END) as avg_eff
     FROM batches WHERE status='Completed'`
  );

  // 3. Sales
  const [sales] = await db.execute('SELECT SUM(quantity*price_per_unit) as total_rev FROM sales');
  const [exp] = await db.execute('SELECT SUM(amount) as total_exp FROM expenses');
  const [cats] = await db.execute('SELECT product_type, SUM(quantity) as total_sold FROM sales GROUP BY product_type');
  const [buyers] = await db.execute(
    `SELECT buyer, SUM(quantity*price_per_unit) as total_profit, SUM(quantity) as total_qty
     FROM sales GROUP BY buyer ORDER BY total_profit DESC LIMIT 5`
  );

  // 4. Stock calculations
  const soldMap = {};
  cats.forEach(c => { soldMap[c.product_type] = parseFloat(c.total_sold || 0); });
  const oilStock = parseFloat(batchSum[0].total_oil || 0) - (soldMap['Oil'] || 0);
  const cbStock = parseFloat(batchSum[0].total_carbon || 0) - (soldMap['Carbon Black'] || 0);
  const steelStock = parseFloat(batchSum[0].total_steel || 0) - (soldMap['Steel Wire'] || soldMap['Steel'] || 0);
  const gasStock = parseFloat(batchSum[0].total_gas || 0) - (soldMap['Gas'] || 0);

  // 5. Daily / Monthly breakdowns
  const [dailyBatches] = await db.execute(
    `SELECT date, SUM(oil_output) as oil, SUM(carbon_output) as carbon,
            SUM(steel_output) as steel, SUM(gas_output) as gas,
            SUM(input_tyres) as tyres
     FROM batches WHERE status='Completed'
     GROUP BY date ORDER BY date DESC LIMIT 7`
  );
  const today = new Date().toISOString().slice(0,7); // YYYY-MM
  const [monthlyBatches] = await db.execute(
    `SELECT strftime('%Y-%m', date) as month,
            SUM(oil_output) as oil, SUM(carbon_output) as carbon,
            SUM(steel_output) as steel, SUM(gas_output) as gas,
            SUM(input_tyres) as tyres, COUNT(*) as batches
     FROM batches WHERE status='Completed'
     GROUP BY month ORDER BY month DESC LIMIT 6`
  );

  console.log('\n===== DASHBOARD AUDIT RESULTS =====\n');
  console.log('--- Tyres in Hand ---');
  console.log('  Total Received:', inv[0].total_in);
  console.log('  Total Used in Batches:', batchUsed[0].total_used);
  console.log('  Tyres in Hand (stock):', tyresInHand.toFixed(2), 'kg\n');

  console.log('--- Oil in Tanks (net stock) ---');
  console.log('  Total Produced:', batchSum[0].total_oil);
  console.log('  Sold (Oil):', soldMap['Oil'] || 0);
  console.log('  Oil Stock:', oilStock.toFixed(2), 'L\n');

  console.log('--- Total Sales Revenue ---');
  console.log('  Total Revenue:', parseFloat(sales[0].total_rev || 0).toFixed(2), '\n');

  console.log('--- Estimated Profit ---');
  console.log('  Revenue:', parseFloat(sales[0].total_rev || 0).toFixed(2));
  console.log('  Expenses:', parseFloat(exp[0].total_exp || 0).toFixed(2));
  console.log('  Net Profit:', (parseFloat(sales[0].total_rev || 0) - parseFloat(exp[0].total_exp || 0)).toFixed(2), '\n');

  console.log('--- Production Summary (Completed Batches) ---');
  console.log('  Batches:', batchSum[0].batch_count);
  console.log('  Oil Produced:', batchSum[0].total_oil, 'L');
  console.log('  Carbon Black:', batchSum[0].total_carbon, 'kg');
  console.log('  Steel Wire:', batchSum[0].total_steel, 'kg');
  console.log('  Gas Generated:', batchSum[0].total_gas, 'm3');
  console.log('  Total Tyres Processed:', batchSum[0].total_input, 'kg');
  console.log('  Avg Yield %:', parseFloat(batchSum[0].avg_eff || 0).toFixed(2), '%\n');

  console.log('--- Current Stock ---');
  console.log('  Oil Stock:', oilStock.toFixed(2), 'L');
  console.log('  Carbon Black Stock:', cbStock.toFixed(2), 'kg');
  console.log('  Steel Stock:', steelStock.toFixed(2), 'kg');
  console.log('  Gas Stock:', gasStock.toFixed(2), 'm3\n');

  console.log('--- Sales Categories ---');
  cats.forEach(c => console.log(' ', c.product_type, ':', c.total_sold));
  console.log();

  console.log('--- Top Buyers ---');
  buyers.forEach(b => console.log(' ', b.buyer, ':', parseFloat(b.total_profit).toFixed(2), '| qty:', b.total_qty));
  console.log();

  console.log('--- Daily Production (Last 7 days) ---');
  dailyBatches.forEach(d => console.log(JSON.stringify(d)));
  console.log();

  console.log('--- Monthly Production ---');
  monthlyBatches.forEach(m => console.log(JSON.stringify(m)));
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
