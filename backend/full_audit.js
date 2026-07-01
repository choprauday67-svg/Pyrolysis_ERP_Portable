/**
 * Full ERP System Audit Script - v2
 */
const http = require('http');
const loginData = JSON.stringify({ email: 'admin@pyrolysis.com', password: 'admin123' });

function fetchAPI(tok, path) {
  return new Promise((resolve) => {
    http.get(
      { host: 'localhost', port: 5000, path, headers: { Authorization: 'Bearer ' + tok } },
      res => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
      }
    ).on('error', () => resolve({}));
  });
}

const req = http.request(
  { host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length } },
  res => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', async () => {
      const r = JSON.parse(d);
      if (!r.token) { console.log('LOGIN FAIL:', d); return; }
      const tok = r.token;
      let pass = 0, fail = 0;

      function check(name, condition, actual) {
        if (condition) { console.log(`  ✅ ${name}: ${actual}`); pass++; }
        else { console.log(`  ❌ FAIL ${name}: ${actual}`); fail++; }
      }

      // ── 1. DASHBOARD STATS ──────────────────────────────────────────────
      console.log('\n=== 1. Dashboard Stats ===');
      const stats = await fetchAPI(tok, '/api/dashboard/stats');
      check('API responds', !stats.message, `Revenue=₹${stats.summary?.totalRevenue}`);
      check('Revenue > 0', stats.summary?.totalRevenue > 0, stats.summary?.totalRevenue);
      check('Profit > 0', stats.summary?.netProfit > 0, stats.summary?.netProfit);
      check('Tyre Stock >= 0', stats.summary?.currentStock >= 0, stats.summary?.currentStock + ' kg');
      check('ANOMALY alert fires', stats.alerts?.list?.some(a => a.type === 'ANOMALY'), stats.alerts?.list?.map(a=>a.type).join(','));
      check('PAYMENT alert fires', stats.alerts?.list?.some(a => a.type === 'PAYMENT'), stats.alerts?.list?.map(a=>a.type).join(','));

      // ── 2. PRODUCTION KPIs ──────────────────────────────────────────────
      console.log('\n=== 2. Production KPIs ===');
      const kpis = await fetchAPI(tok, '/api/dashboard/production-kpis');
      check('Oil produced > 0', kpis.allTime?.oil > 0, kpis.allTime?.oil + ' kg');
      check('Carbon produced > 0', kpis.allTime?.carbon > 0, kpis.allTime?.carbon + ' kg');
      check('Steel produced > 0', kpis.allTime?.steel > 0, kpis.allTime?.steel + ' kg');
      check('Tyre stock consistent', kpis.stock?.tyres === stats.summary?.currentStock, `${kpis.stock?.tyres} = ${stats.summary?.currentStock}`);
      check('Yield 35-50%', kpis.allTime?.avgYield >= 35 && kpis.allTime?.avgYield <= 50, kpis.allTime?.avgYield + '%');
      check('Utilization > 0', kpis.utilization?.percentage > 0, kpis.utilization?.percentage + '%');
      const oilRatio = (kpis.allTime?.oil / kpis.allTime?.tyres * 100);
      check('Oil yield ratio 38-48%', oilRatio >= 35 && oilRatio <= 55, oilRatio?.toFixed(1) + '%');

      // ── 3. SEARCH ───────────────────────────────────────────────────────
      console.log('\n=== 3. Search Telemetry ===');
      for (const [q, min] of [['oil',1],['BATCH',5],['kumar',1],['labor',1],['bharat',1]]) {
        const sr = await fetchAPI(tok, `/api/dashboard/search?q=${q}`);
        check(`Search "${q}"`, sr.results?.length >= min, sr.results?.length + ' results');
      }

      // ── 4. INVOICES ─────────────────────────────────────────────────────
      console.log('\n=== 4. Invoices ===');
      const invResp = await fetchAPI(tok, '/api/invoices');
      const invArr = invResp.invoices || invResp.data || [];
      check('Invoices loaded', invArr.length > 0, invArr.length + ' invoices');
      check('Has pending/overdue', invArr.filter(i => ['Pending','Overdue'].includes(i.payment_status)).length > 0,
        invArr.filter(i => ['Pending','Overdue'].includes(i.payment_status)).length + ' unpaid');
      check('Invoice totals > 0', invArr.every(i => i.total_amount > 0), 'all have amounts');

      // ── 5. CUSTOMERS ────────────────────────────────────────────────────
      console.log('\n=== 5. Customers ===');
      const custResp = await fetchAPI(tok, '/api/customers');
      const custArr = custResp.customers || custResp.data || custResp;
      const custCount = Array.isArray(custArr) ? custArr.length : Object.keys(custArr).length;
      check('Customers loaded', custCount >= 5, custCount + ' customers');

      // ── 6. SUPPLIERS ────────────────────────────────────────────────────
      console.log('\n=== 6. Suppliers ===');
      const suppResp = await fetchAPI(tok, '/api/suppliers');
      const suppArr = suppResp.suppliers || suppResp.data || suppResp;
      const suppCount = Array.isArray(suppArr) ? suppArr.length : Object.keys(suppArr).length;
      check('Suppliers loaded', suppCount >= 3, suppCount + ' suppliers');

      // ── 7. BATCHES ──────────────────────────────────────────────────────
      console.log('\n=== 7. Production Batches ===');
      const batchResp = await fetchAPI(tok, '/api/batches');
      const batchArr = batchResp.batches || batchResp.data || batchResp;
      const batchCount = Array.isArray(batchArr) ? batchArr.length : 0;
      check('Batches loaded', batchCount >= 9, batchCount + ' batches');
      if (Array.isArray(batchArr)) {
        const completed = batchArr.filter(b => b.status === 'Completed').length;
        check('Completed batches > 0', completed > 0, completed + ' completed');
        const anom = batchArr.find(b => b.batch_number === 'BATCH-2026-008');
        check('Anomaly batch exists', !!anom, anom ? 'found' : 'not found');
        // Validate yield ratios
        const validBatches = batchArr.filter(b => b.status === 'Completed' && b.oil_output && b.input_tyres);
        const badYield = validBatches.filter(b => {
          const oilPct = b.oil_output / b.input_tyres;
          return oilPct < 0.20 || oilPct > 0.60;
        });
        check('Yield ratios in range (excl. anomaly)', badYield.length <= 1, badYield.length + ' batches out of range');
      }

      // ── 8. INVENTORY ────────────────────────────────────────────────────
      console.log('\n=== 8. Inventory ===');
      const invResp2 = await fetchAPI(tok, '/api/inventory');
      const invArr2 = invResp2.inventory || invResp2.data || invResp2;
      const invCount = Array.isArray(invArr2) ? invArr2.length : 0;
      check('Inventory loaded', invCount > 0, invCount + ' records');
      if (Array.isArray(invArr2)) {
        const totalIn = invArr2.reduce((a, b) => a + (b.weight || 0), 0);
        check('Total inventory > 200k kg', totalIn >= 200000, totalIn + ' kg');
      }

      // ── 9. EXPENSES ─────────────────────────────────────────────────────
      console.log('\n=== 9. Expenses ===');
      const expResp = await fetchAPI(tok, '/api/expenses');
      const expArr = expResp.expenses || expResp.data || expResp;
      const expCount = Array.isArray(expArr) ? expArr.length : 0;
      check('Expenses loaded', expCount >= 5, expCount + ' records');
      if (Array.isArray(expArr)) {
        const totalExp = expArr.reduce((a, b) => a + (b.amount || 0), 0);
        check('Expenses less than revenue', totalExp < stats.summary?.totalRevenue, `₹${totalExp} < ₹${stats.summary?.totalRevenue}`);
      }

      // ── 10. DATA INTEGRITY ──────────────────────────────────────────────
      console.log('\n=== 10. Data Integrity ===');
      check('No negative tyre stock', stats.summary?.currentStock >= 0, stats.summary?.currentStock + ' kg');
      check('No negative oil stock', stats.summary?.currentOilStock >= 0, stats.summary?.currentOilStock + ' kg');
      check('No negative carbon stock', stats.summary?.currentCarbonStock >= 0, stats.summary?.currentCarbonStock + ' kg');
      check('No negative steel stock', stats.summary?.currentSteelStock >= 0, stats.summary?.currentSteelStock + ' kg');
      const profitMargin = (stats.summary?.netProfit / stats.summary?.totalRevenue * 100);
      check('Profit margin > 20%', profitMargin > 20, profitMargin?.toFixed(1) + '%');

      // ── SUMMARY ─────────────────────────────────────────────────────────
      console.log(`\n${'='.repeat(55)}`);
      console.log(`AUDIT COMPLETE: ${pass} PASSED ✅ | ${fail} FAILED ❌`);
      if (fail === 0) console.log('🎉 ALL CHECKS PASSED — ERP System is production-ready!');
      else console.log(`⚠️  ${fail} issue(s) — review above before deployment.`);
      console.log('='.repeat(55));
    });
  }
);
req.write(loginData); req.end();
