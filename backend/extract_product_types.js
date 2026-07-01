/**
 * Extract the Sales form product_type dropdown options from the minified React bundle.
 * Also dump all distinct product_type values currently in the sales DB table.
 * Run: node extract_product_types.js
 */
const fs   = require('fs');
const path = require('path');
const db   = require('./config/db');

async function run() {
    // ── 1. Database audit ──────────────────────────────────────────────────────
    console.log('=== DB: Distinct product_type in sales table ===');
    const [rows] = await db.execute(
        'SELECT product_type, COUNT(*) as cnt, SUM(quantity) as total_qty FROM sales GROUP BY product_type'
    );
    console.table(rows);

    // ── 2. Bundle extraction ───────────────────────────────────────────────────
    const bundlePath = path.join(__dirname, '../frontend/assets/index-DiIpccgm.js');
    if (!fs.existsSync(bundlePath)) {
        console.log('Bundle not found at', bundlePath);
        process.exit(0);
    }

    const bundle = fs.readFileSync(bundlePath, 'utf8');

    // Find the sales form state initialisation
    const stateIdx = bundle.indexOf('product_type:`Oil`');
    if (stateIdx !== -1) {
        console.log('\n=== Sales form initial state (±200 chars) ===');
        console.log(bundle.substring(Math.max(0, stateIdx - 50), stateIdx + 400));
    }

    // Find the <select> for product_type and extract option values
    // Pattern: select ... product_type ... option value:
    const selectIdx = bundle.indexOf('value:i.product_type');
    if (selectIdx !== -1) {
        console.log('\n=== Sales form <select> block (±800 chars) ===');
        console.log(bundle.substring(Math.max(0, selectIdx - 100), selectIdx + 800));
    }

    // Find all backtick-quoted strings that appear after "option" — these are the option values
    const optionPattern = /option[^`]{0,60}`([^`]{1,60})`/g;
    const sectionStart = bundle.indexOf('value:i.product_type');
    if (sectionStart !== -1) {
        const section = bundle.substring(sectionStart, sectionStart + 1000);
        let m;
        const found = [];
        while ((m = optionPattern.exec(section)) !== null) {
            found.push(m[1]);
        }
        console.log('\n=== Extracted option value candidates ===');
        console.log(found);
    }

    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
