/**
 * Deep diagnostic: trace the EXACT values used in oil stock calculation.
 * Prints every intermediate value so we can see where the mismatch is.
 * Run: node diagnose_oil_stock.js
 */
const db      = require('./config/db');
const Batch   = require('./models/batchModel');
const Sales   = require('./models/salesModel');
require('dotenv').config();

async function run() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('        Oil Stock Calculation – Full Trace');
    console.log('═══════════════════════════════════════════════════════\n');

    // ── Step 1: Batch production totals ────────────────────────────────────────
    const batchSummary = await Batch.getSummary();
    console.log('=== Batch.getSummary() result ===');
    console.log(batchSummary);

    const safeBatchTotalOil = batchSummary && batchSummary.total_oil
        ? parseFloat(batchSummary.total_oil) : 0;
    console.log(`\nsafeBatchTotalOil = ${safeBatchTotalOil}`);

    // ── Step 2: Sales category summary ─────────────────────────────────────────
    const salesCategories = await Sales.getCategorySummary();
    console.log('\n=== Sales.getCategorySummary() result ===');
    console.table(salesCategories);

    const soldMap = {};
    salesCategories.forEach(s => soldMap[s.product_type] = parseFloat(s.total_sold) || 0);
    console.log('\nsoldMap =', soldMap);

    // ── Step 3: Stock calculation ───────────────────────────────────────────────
    const currentOilStock    = safeBatchTotalOil - (soldMap['Oil'] || 0);
    const currentCarbonStock = parseFloat(batchSummary?.total_carbon || 0) - (soldMap['Carbon Black'] || 0);
    const currentSteelStock  = parseFloat(batchSummary?.total_steel || 0) - (soldMap['Steel Wire'] || soldMap['Steel'] || 0);

    console.log('\n=== Calculated Stocks ===');
    console.log(`Oil    : ${safeBatchTotalOil} produced  -  ${soldMap['Oil'] || 0} sold  =  ${currentOilStock} L`);
    console.log(`Carbon : ${batchSummary?.total_carbon || 0} produced  -  ${soldMap['Carbon Black'] || 0} sold  =  ${currentCarbonStock} kg`);
    console.log(`Steel  : ${batchSummary?.total_steel || 0} produced  -  ${soldMap['Steel Wire'] || soldMap['Steel'] || 0} sold  =  ${currentSteelStock} kg`);

    // ── Step 4: What does Batch.getSummary() actually query? ─────────────────
    console.log('\n=== Raw batch totals from DB (Completed batches only) ===');
    const [raw] = await db.execute(`
        SELECT
            COUNT(*) as batch_count,
            COALESCE(SUM(oil_output), 0)    as total_oil,
            COALESCE(SUM(carbon_output), 0) as total_carbon,
            COALESCE(SUM(steel_output), 0)  as total_steel
        FROM batches WHERE status = 'Completed'
    `);
    console.table(raw);

    // ── Step 5: ALL batches (to detect if non-Completed batches produce outputs)
    console.log('\n=== ALL batch outputs by status ===');
    const [byStatus] = await db.execute(`
        SELECT status,
            COUNT(*) as cnt,
            COALESCE(SUM(oil_output), 0)    as oil,
            COALESCE(SUM(carbon_output), 0) as carbon,
            COALESCE(SUM(steel_output), 0)  as steel
        FROM batches GROUP BY status
    `);
    console.table(byStatus);

    // ── Step 6: Recent sales records ──────────────────────────────────────────
    console.log('\n=== Last 10 sales records ===');
    const [sales] = await db.execute(
        'SELECT id, product_type, quantity, buyer, date FROM sales ORDER BY id DESC LIMIT 10'
    );
    console.table(sales);

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
