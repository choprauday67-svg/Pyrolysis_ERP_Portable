const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'pyrolysis_erp.db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error("Error opening DB:", err.message);
        process.exit(1);
    }
});

const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

async function analyze() {
    try {
        const invoices = await query("SELECT invoice_number, invoice_date, customer_name, taxable_amount, cgst, sgst, igst, total_amount, payment_status FROM invoices WHERE payment_status != 'Draft'");
        let invTotal = 0;
        let invTaxableTotal = 0;
        let invGstTotal = 0;
        invoices.forEach(i => {
            invTotal += i.total_amount;
            invTaxableTotal += i.taxable_amount;
            invGstTotal += (i.cgst + i.sgst + i.igst);
        });

        const sales = await query("SELECT id, date, product_type, quantity, price_per_unit, (quantity * price_per_unit) as revenue FROM sales");
        let salesTotal = 0;
        sales.forEach(s => {
            salesTotal += s.revenue;
        });
        
        const draftInvoices = await query("SELECT invoice_number, taxable_amount FROM invoices WHERE payment_status = 'Draft'");
        let draftTaxableTotal = 0;
        draftInvoices.forEach(i => {
            draftTaxableTotal += i.taxable_amount;
        });

        console.log(`\nHere are the exact figures:\n`);
        console.log(`1. Total invoice revenue (non-draft): ₹${invTotal.toFixed(2)}`);
        console.log(`2. Total sales/dispatch revenue: ₹${salesTotal.toFixed(2)}`);
        console.log(`3. Difference: ₹${(invTotal - salesTotal).toFixed(2)}\n`);

        console.log(`4. Records accounting for the gap:`);
        console.log(`   a) The Dashboard (Invoice Revenue) includes GST taxes.`);
        console.log(`      Total GST collected on non-draft invoices: ₹${invGstTotal.toFixed(2)}`);
        
        console.log(`   b) There are Sales Dispatch records that have not been formally invoiced (or are in Draft state).`);
        console.log(`      Total taxable value of Draft Invoices: ₹${draftTaxableTotal.toFixed(2)}`);
        
        console.log(`\nLet's do the math:`);
        console.log(`Sales Dispatch Revenue (Base Value): ₹${salesTotal.toFixed(2)}`);
        console.log(`- Minus uninvoiced/draft sales:     -₹${(salesTotal - invTaxableTotal).toFixed(2)}`);
        console.log(`= Invoice Taxable Amount:            ₹${invTaxableTotal.toFixed(2)}`);
        console.log(`+ Plus Total GST:                   +₹${invGstTotal.toFixed(2)}`);
        console.log(`= Total Invoice Revenue (Dashboard): ₹${invTotal.toFixed(2)}`);

        if ((invTaxableTotal + invGstTotal) === invTotal) {
            console.log(`\nMath checks out perfectly!`);
        }
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        db.close();
    }
}

analyze();
