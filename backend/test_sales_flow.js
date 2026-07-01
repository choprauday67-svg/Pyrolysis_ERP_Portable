/**
 * Full live API integration test for Sales → Dashboard propagation.
 * Run: node test_sales_flow.js
 */
const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const TOKEN  = jwt.sign({ id: 1, role: 'Admin' }, SECRET, { expiresIn: '1d' });

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const req = http.request({
            hostname: 'localhost', port: 5000, path, method,
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
            }
        }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch(e) { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function run() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  Sales → Dashboard Propagation Integration Test');
    console.log('═══════════════════════════════════════════════════\n');

    // 1. Baseline dashboard stats
    let r = await request('GET', '/api/dashboard/stats');
    const initial = r.body.summary;
    console.log('📊 Baseline Dashboard:');
    console.log(`  Revenue:       ₹${Number(initial.totalRevenue).toLocaleString('en-IN')}`);
    console.log(`  Net Profit:    ₹${Number(initial.netProfit).toLocaleString('en-IN')}`);
    console.log(`  Oil Stock:     ${Number(initial.currentOilStock).toLocaleString('en-IN')} L`);
    console.log(`  Carbon Stock:  ${Number(initial.currentCarbonStock).toLocaleString('en-IN')} kg`);
    console.log(`  Steel Stock:   ${Number(initial.currentSteelStock).toLocaleString('en-IN')} kg`);

    // 2. Inspect response shapes of activity APIs
    console.log('\n🔍 Checking API response shapes...');
    const salesShape = await request('GET', '/api/sales');
    const batchShape = await request('GET', '/api/batches');
    const invShape   = await request('GET', '/api/invoices');
    const expShape   = await request('GET', '/api/expenses');
    const stkShape   = await request('GET', '/api/inventory');
    console.log(`  /api/sales     keys: [${Object.keys(salesShape.body).join(', ')}]`);
    console.log(`  /api/batches   keys: [${Object.keys(batchShape.body).join(', ')}]`);
    console.log(`  /api/invoices  keys: [${Object.keys(invShape.body).join(', ')}]`);
    console.log(`  /api/expenses  keys: [${Object.keys(expShape.body).join(', ')}]`);
    console.log(`  /api/inventory keys: [${Object.keys(stkShape.body).join(', ')}]`);

    // 3. Create a new Sale
    const saleQty   = 100;
    const salePrice = 45;
    console.log(`\n💳 Creating test sale: ${saleQty} L Oil @ ₹${salePrice}/L to 'Test Buyer'...`);
    const saleRes = await request('POST', '/api/sales', {
        product_type: 'Oil',
        quantity: saleQty,
        price_per_unit: salePrice,
        buyer: 'Test Buyer (Auto Test)',
        date: new Date().toISOString().slice(0, 10)
    });
    if (saleRes.status !== 201) {
        console.error('❌ Sale creation failed:', saleRes.body);
        process.exit(1);
    }
    const saleId = saleRes.body.data.id;
    console.log(`  ✅ Sale #${saleId} created.`);

    // 4. Post-sale dashboard stats
    r = await request('GET', '/api/dashboard/stats');
    const after = r.body.summary;
    const revDelta   = after.totalRevenue   - initial.totalRevenue;
    const profDelta  = after.netProfit      - initial.netProfit;
    const oilDelta   = after.currentOilStock - initial.currentOilStock;

    console.log('\n📊 Post-Sale Dashboard:');
    console.log(`  Revenue:       ₹${Number(after.totalRevenue).toLocaleString('en-IN')}   (Δ ${revDelta >= 0 ? '+' : ''}${revDelta})`);
    console.log(`  Net Profit:    ₹${Number(after.netProfit).toLocaleString('en-IN')}   (Δ ${profDelta >= 0 ? '+' : ''}${profDelta})`);
    console.log(`  Oil Stock:     ${Number(after.currentOilStock).toLocaleString('en-IN')} L  (Δ ${oilDelta})`);

    // 5. Verify Top Customers
    const topBuyers = r.body.strategy.topBuyers;
    const testBuyer = topBuyers.find(b => b.buyer === 'Test Buyer (Auto Test)');
    console.log('\n👥 Top Customers includes Test Buyer:', testBuyer ? '✅ YES' : '❌ NO');

    // 6. Assertions
    console.log('\n🧪 Test Results:');
    const expectedRevIncrease = saleQty * salePrice;
    console.log(`  Revenue increase (${expectedRevIncrease}):  ${revDelta === expectedRevIncrease ? '✅ PASS' : `❌ FAIL (got ${revDelta})`}`);
    console.log(`  Profit increase (${expectedRevIncrease}):   ${profDelta === expectedRevIncrease ? '✅ PASS' : `❌ FAIL (got ${profDelta})`}`);
    console.log(`  Oil stock decreased (-${saleQty}):          ${oilDelta === -saleQty ? '✅ PASS' : `❌ FAIL (got ${oilDelta})`}`);

    // 7. Cleanup
    console.log(`\n🧹 Cleaning up sale #${saleId}...`);
    await request('DELETE', `/api/sales/${saleId}`);
    console.log('  ✅ Done.\n');
}
run().catch(console.error);
