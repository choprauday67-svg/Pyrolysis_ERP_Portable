const db = require('./config/db');

(async () => {
  try {
    // Dashboard revenue: invoices (non-Draft) + sales total
    const [invRev] = await db.execute("SELECT COALESCE(SUM(total_amount),0) as r FROM invoices WHERE payment_status != 'Draft'");
    const [salesRev] = await db.execute('SELECT COALESCE(SUM(quantity * price_per_unit),0) as r FROM sales');
    const [salesRevByCat] = await db.execute('SELECT product_type, COALESCE(SUM(quantity*price_per_unit),0) as rev, COUNT(*) as cnt FROM sales GROUP BY product_type');
    const [expTotal] = await db.execute('SELECT COALESCE(SUM(amount),0) as r FROM expenses');
    const [invCount] = await db.execute("SELECT payment_status, COUNT(*) as c, COALESCE(SUM(total_amount),0) as total FROM invoices GROUP BY payment_status");
    const [allInvTotal] = await db.execute("SELECT COALESCE(SUM(total_amount),0) as r FROM invoices");
    
    const invoiceRevenue = Number(invRev[0].r);
    const salesRevenue = Number(salesRev[0].r);
    const dashboardTotal = invoiceRevenue + salesRevenue;

    console.log('=== DASHBOARD REVENUE BREAKDOWN ===');
    console.log('Invoice revenue (non-Draft):', invoiceRevenue.toFixed(2));
    console.log('Sales revenue (all records): ', salesRevenue.toFixed(2));
    console.log('All invoices (incl Draft):   ', Number(allInvTotal[0].r).toFixed(2));
    console.log('TOTAL Dashboard Revenue:     ', dashboardTotal.toFixed(2));
    
    console.log('\n=== ANALYTICS REVENUE BREAKDOWN ===');
    console.log('Analytics Revenue (sales only):', salesRevenue.toFixed(2));
    salesRevByCat.forEach(r => console.log('  - ' + r.product_type + ': ₹' + Number(r.rev).toFixed(2) + ' (' + r.cnt + ' records)'));
    
    console.log('\n=== INVOICE STATUS BREAKDOWN ===');
    invCount.forEach(r => console.log('  ' + r.payment_status + ': ' + r.c + ' invoices, total: ₹' + Number(r.total).toFixed(2)));
    
    console.log('\n=== EXPENSES TOTAL ===');
    console.log('All expenses:', Number(expTotal[0].r).toFixed(2));

    console.log('\n=== DIAGNOSIS ===');
    console.log('Dashboard adds BOTH invoice revenue AND sales revenue');
    console.log('Analytics uses ONLY sales revenue (quantity * price_per_unit)');
    console.log('Discrepancy is exactly: ₹' + invoiceRevenue.toFixed(2) + ' (the invoice revenue being double-counted or extra)');

    const diff = dashboardTotal - salesRevenue;
    console.log('Gap (Dashboard - Analytics): ₹' + diff.toFixed(2));
  } catch (e) {
    console.error('Audit error:', e);
  }
  process.exit(0);
})();
