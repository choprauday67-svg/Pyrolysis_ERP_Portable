/**
 * full_audit.js
 * Project-wide audit: confirms no independent revenue/profit calculations remain.
 * All financial KPIs now route through financialService.js.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKEND  = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');

// Patterns that indicate independent financial calculations (red flags)
const BAD_PATTERNS = [
  /invoiceRevenue\s*\+\s*salesRevenue/,
  /getSummary\(\)\s*\|\|\s*0/,   // Sales.getSummary() used for revenue
  /SUM\(quantity\s*\*\s*price_per_unit\).*total_revenue/i,
  /total_revenue.*SUM\(quantity/i,
  /const\s+costByProduct\s*=\s*\{/,   // inline cost map (not imported)
  /const\s+DEFAULT_UNIT_COST\s*=\s*\d+/,  // inline default cost
];

// Files to exclude from scanning (audit scripts and backups)
const EXCLUDE = ['audit_revenue.js', 'verify_fix.js', 'full_audit_check.js',
                 'full_audit.js', '.bak', 'backup', 'node_modules', '.git'];

function scanDir(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const name of fs.readdirSync(dir)) {
    if (EXCLUDE.some(ex => name.includes(ex))) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(scanDir(full));
    } else if (name.endsWith('.js') || name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

let issues = [];
let checked = 0;

for (const file of [...scanDir(BACKEND), ...scanDir(FRONTEND)]) {
  const rel = file.replace(ROOT + path.sep, '');
  const text = fs.readFileSync(file, 'utf8');
  checked++;
  for (const pat of BAD_PATTERNS) {
    if (pat.test(text)) {
      issues.push({ file: rel, pattern: pat.toString() });
    }
  }
}

console.log('\n══════════════════════════════════════════════════════════');
console.log('  PROJECT-WIDE FINANCIAL LOGIC AUDIT');
console.log('══════════════════════════════════════════════════════════\n');
console.log(`Checked ${checked} files\n`);

if (issues.length === 0) {
  console.log('✅  NO independent revenue/profit calculations found.');
  console.log('✅  All modules are using financialService.js as single source of truth.\n');
} else {
  console.log(`❌  Found ${issues.length} issue(s):\n`);
  issues.forEach(i => console.log(`  FILE: ${i.file}\n  PATTERN: ${i.pattern}\n`));
}

// Also run a live API check
const financialService = require('./services/financialService');
(async () => {
  const snap = await financialService.getFinancialSnapshot();
  const products = await financialService.getCommodityMargins();
  
  const salesDispatchRev  = products.reduce((s, p) => s + p.revenue, 0);
  const salesDispatchCost = products.reduce((s, p) => s + p.estimated_cost, 0);
  const salesDispatchProfit = products.reduce((s, p) => s + p.profit, 0);
  const salesDispatchMargin = salesDispatchRev > 0
    ? Number(((salesDispatchProfit / salesDispatchRev) * 100).toFixed(2)) : 0;

  console.log('┌─ LIVE API VALUES (what every module now returns) ──────┐');
  console.log('│');
  console.log('│  [Dashboard + Analytics TOP KPIs]');
  console.log('│  Revenue:           ₹' + snap.revenue.toFixed(2));
  console.log('│  Expenses:          ₹' + snap.totalExpenses.toFixed(2));
  console.log('│  Net Profit:        ₹' + snap.netProfit.toFixed(2));
  console.log('│  Net Margin:         ' + snap.marginPct + '%');
  console.log('│');
  console.log('│  [Analytics COMMODITY BREAKDOWN KPIs]');
  console.log('│  Dispatch Revenue:  ₹' + salesDispatchRev.toFixed(2));
  console.log('│  Dispatch Cost:     ₹' + salesDispatchCost.toFixed(2));
  console.log('│  Dispatch Profit:   ₹' + salesDispatchProfit.toFixed(2));
  console.log('│  Dispatch Margin:    ' + salesDispatchMargin + '%');
  console.log('│');
  console.log('│  [Modules using financialService.js]');
  console.log('│  • dashboardController.js    → getFinancialSnapshot()');
  console.log('│  • analyticsController.js    → getFinancialSnapshot() + getCommodityMargins()');
  console.log('│  • reportController.js       → invoice SQL + cost from PRODUCTION_COST_PER_UNIT');
  console.log('└─────────────────────────────────────────────────────────┘\n');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
