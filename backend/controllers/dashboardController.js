const Inventory = require('../models/inventoryModel');
const Batch = require('../models/batchModel');
const Sales = require('../models/salesModel');
const Settings = require('../models/settingsModel');
const CommodityTrend = require('../models/commodityTrendModel');
const db = require('../config/db');
const financialService = require('../services/financialService');
const inventoryService = require('../services/inventoryService');

exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Get Summary Stats
    const invSummary = await Inventory.getTotalSummary();
    const batchSummary = await Batch.getSummary();

    // ── SINGLE SOURCE OF TRUTH: Revenue from invoices only (non-Draft) ──────
    // Previously this added invoice revenue + sales revenue, causing a double-count.
    // Both tables represent the same physical sales through different lenses:
    //   • invoices = formal GST-billed transactions (authoritative financial record)
    //   • sales    = dispatch quantity records (used for stock tracking only)
    // Fix: use ONLY invoice revenue for all financial KPIs.
    const financials = await financialService.getFinancialSnapshot();
    const totalRevenue  = financials.revenue;
    const totalExpenses = financials.totalExpenses;
    
    // 2. Get Strategy Insights
    const buyerStrategy = await Sales.getBuyerInsights();
    
    // 3. Check Alerts/Thresholds
    const allSettings = await Settings.getAll();
    const settingsMap = {};
    allSettings.forEach(s => settingsMap[s.setting_key] = s.setting_value);

    const tyreLimit = parseFloat(settingsMap['TYRE_LIMIT'] || settingsMap['MIN_STOCK_THRESHOLD'] || 1000);
    const oilLimit = parseFloat(settingsMap['OIL_LIMIT'] || 500);
    const carbonLimit = parseFloat(settingsMap['CARBON_LIMIT'] || 500);

    const stockInfo = await inventoryService.getCurrentStock();
    const currentOilStock = stockInfo.oil;
    const currentCarbonStock = stockInfo.carbon;
    const currentSteelStock = stockInfo.steel;
    const currentGasStock = stockInfo.gas;
    const clampedTyreStock = stockInfo.tyres;
    const rawTyreStock = stockInfo.rawTyre;
    const tyreDataGap = stockInfo.tyreDataGap;

    // Check for invoice alerts
    const [pendingInvoices] = await db.execute(`SELECT COUNT(*) as count FROM invoices WHERE payment_status = 'Draft'`);
    const [overdueInvoices] = await db.execute(`SELECT COUNT(*) as count FROM invoices WHERE payment_status = 'Unpaid' OR payment_status = 'Overdue'`);

    // Check for production anomalies (Yields outside typical ranges: Oil 40-45%, Carbon 30-35%, Steel 10-15%)
    const [anomalies] = await db.execute(`
      SELECT batch_number, 
             (oil_output/input_tyres)*100 as oil_pct,
             (carbon_output/input_tyres)*100 as carbon_pct,
             (steel_output/input_tyres)*100 as steel_pct
      FROM batches 
      WHERE status = 'Completed' AND input_tyres > 0
      AND (
        (oil_output/input_tyres) < 0.35 OR (oil_output/input_tyres) > 0.50 OR
        (carbon_output/input_tyres) < 0.25 OR (carbon_output/input_tyres) > 0.40 OR
        (steel_output/input_tyres) < 0.05 OR (steel_output/input_tyres) > 0.20
      )
      ORDER BY date DESC LIMIT 5
    `);

    const alerts = [];
    if (tyreDataGap) {
      alerts.push({ type: 'DATA_GAP', message: `Inventory gap detected: batch consumption exceeds recorded receipts by ${Math.abs(rawTyreStock).toLocaleString('en-IN')} kg. Please reconcile inventory records.` });
    }
    if (clampedTyreStock < tyreLimit) {
      alerts.push({ type: 'TYRE', message: `Low tyre stock: ${clampedTyreStock.toLocaleString('en-IN')} kg (Limit: ${tyreLimit.toLocaleString('en-IN')} kg)` });
    }
    if (currentOilStock < oilLimit) {
      alerts.push({ type: 'OIL', message: `Low oil stock: ${currentOilStock.toFixed(2)}L (Limit: ${oilLimit}L)` });
    }
    if (currentCarbonStock < carbonLimit) {
      alerts.push({ type: 'CARBON', message: `Low carbon stock: ${currentCarbonStock.toFixed(2)}kg (Limit: ${carbonLimit}kg)` });
    }
    if (pendingInvoices[0].count > 0) {
      alerts.push({ type: 'INVOICE', message: `Pending Invoices: ${pendingInvoices[0].count} invoices are in Draft state and need approval.` });
    }
    if (overdueInvoices[0].count > 0) {
      alerts.push({ type: 'PAYMENT', message: `Overdue Payments: ${overdueInvoices[0].count} invoices are unpaid or overdue.` });
    }
    if (anomalies.length > 0) {
      alerts.push({ type: 'ANOMALY', message: `Production Anomaly: ${anomalies.length} recent batch(es) (e.g. ${anomalies[0].batch_number}) show irregular yields. Please verify machine parameters.` });
    }
    
    // 4. Net Profit (already computed in financials snapshot)
    const netProfit = financials.netProfit;

    // 5. Historical Data for Charts
    const batchesData = await Batch.getAll();
    
    // 6. Get Market Trends (NEW - additive)
    let marketTrends = null;
    try {
      marketTrends = await CommodityTrend.getMarketTrendSummary();
    } catch (err) {
      console.log('Note: Market trends not available yet');
    }
    
    res.json({
      summary: {
        currentStock: rawTyreStock,
        tyreDataGap,
        currentOilStock: Math.max(0, currentOilStock),
        currentCarbonStock: Math.max(0, currentCarbonStock),
        currentSteelStock: Math.max(0, currentSteelStock),
        currentGasStock: Math.max(0, currentGasStock),
        totalProduction: { 
          oil: batchSummary && batchSummary.total_oil ? parseFloat(batchSummary.total_oil) : 0,
          carbon: batchSummary && batchSummary.total_carbon ? parseFloat(batchSummary.total_carbon) : 0,
          steel: batchSummary && batchSummary.total_steel ? parseFloat(batchSummary.total_steel) : 0,
          gas: batchSummary && batchSummary.total_gas ? parseFloat(batchSummary.total_gas) : 0
        },
        totalRevenue: parseFloat(totalRevenue || 0),
        netProfit: parseFloat(netProfit || 0),
        avgEfficiency: batchSummary && batchSummary.avg_efficiency ? parseFloat(batchSummary.avg_efficiency).toFixed(2) : "0.00"
      },
      strategy: {
        topBuyers: buyerStrategy,
        recommendedAction: buyerStrategy.length > 0 
          ? `Prioritize orders from ${buyerStrategy[0].buyer} for maximum ${buyerStrategy[0].total_profit > 1000 ? 'capital' : 'volume'} gain.` 
          : "N/A"
      },
      alerts: {
        stockAlert: alerts.length > 0,
        list: alerts,
        message: alerts.length > 0 ? alerts[0].message : null,
        thresholds: {
          TYRE: tyreLimit,
          OIL: oilLimit,
          CARBON: carbonLimit
        }
      },
      charts: {
        oilTrends: batchesData.slice(0, 10).map(b => ({ date: new Date(b.date).toLocaleDateString(), quantity: b.oil_output })),
        efficiencyTrends: batchesData.slice(0, 10).map(b => {
             const eff = b.input_tyres > 0 ? (parseFloat(b.oil_output) / parseFloat(b.input_tyres) * 100).toFixed(2) : 0;
             return { date: new Date(b.date).toLocaleDateString(), efficiency: parseFloat(eff) };
        })
      },
      marketTrends: marketTrends || { commodities: [], averageVolatility: 0 }
    });
  } catch (err) {
    console.error("Dashboard controller error:", err);
    res.status(500).json({ message: "Internal System Error during telemetry aggregation" });
  }
};

// ── NEW: Production KPIs endpoint ─────────────────────────────────────────────
exports.getProductionKPIs = async (req, res) => {
  try {
    // All-time totals from completed batches
    const [allTimeRows] = await db.execute(`
      SELECT
        COALESCE(SUM(oil_output),    0) as oil,
        COALESCE(SUM(carbon_output), 0) as carbon,
        COALESCE(SUM(steel_output),  0) as steel,
        COALESCE(SUM(gas_output),    0) as gas,
        COALESCE(SUM(input_tyres),   0) as tyres,
        COUNT(*)                         as batch_count,
        AVG(CASE WHEN input_tyres > 0 THEN (oil_output / input_tyres) * 100 ELSE 0 END) as avg_yield
      FROM batches WHERE status = 'Completed'
    `);

    // Monthly breakdown (last 6 months)
    const [monthly] = await db.execute(`
      SELECT
        strftime('%Y-%m', date)          as period,
        COALESCE(SUM(oil_output),    0)  as oil,
        COALESCE(SUM(carbon_output), 0)  as carbon,
        COALESCE(SUM(steel_output),  0)  as steel,
        COALESCE(SUM(gas_output),    0)  as gas,
        COALESCE(SUM(input_tyres),   0)  as tyres,
        COUNT(*)                          as batches,
        AVG(CASE WHEN input_tyres > 0 THEN (oil_output / input_tyres) * 100 ELSE 0 END) as avg_yield
      FROM batches WHERE status = 'Completed'
      GROUP BY period ORDER BY period DESC LIMIT 6
    `);

    // Daily breakdown (last 30 days)
    const [daily] = await db.execute(`
      SELECT
        date                             as period,
        COALESCE(SUM(oil_output),    0)  as oil,
        COALESCE(SUM(carbon_output), 0)  as carbon,
        COALESCE(SUM(steel_output),  0)  as steel,
        COALESCE(SUM(gas_output),    0)  as gas,
        COALESCE(SUM(input_tyres),   0)  as tyres,
        COUNT(*)                          as batches,
        AVG(CASE WHEN input_tyres > 0 THEN (oil_output / input_tyres) * 100 ELSE 0 END) as avg_yield
      FROM batches WHERE status = 'Completed'
        AND date >= date('now', '-30 days')
      GROUP BY date ORDER BY date DESC LIMIT 30
    `);

    // Today's production
    const [todayRows] = await db.execute(`
      SELECT
        COALESCE(SUM(oil_output),    0) as oil,
        COALESCE(SUM(carbon_output), 0) as carbon,
        COALESCE(SUM(steel_output),  0) as steel,
        COALESCE(SUM(gas_output),    0) as gas,
        COALESCE(SUM(input_tyres),   0) as tyres,
        COUNT(*)                         as batches
      FROM batches WHERE status = 'Completed' AND date = date('now')
    `);

    // This month's production
    const [thisMonthRows] = await db.execute(`
      SELECT
        COALESCE(SUM(oil_output),    0) as oil,
        COALESCE(SUM(carbon_output), 0) as carbon,
        COALESCE(SUM(steel_output),  0) as steel,
        COALESCE(SUM(gas_output),    0) as gas,
        COALESCE(SUM(input_tyres),   0) as tyres,
        COUNT(*)                         as batches
      FROM batches WHERE status = 'Completed'
        AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
    `);

    // Machine utilization
    const [utilRows] = await db.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Completed'   THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'In-Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Planned'     THEN 1 ELSE 0 END) as planned
      FROM batches
    `);

    const at = allTimeRows[0];
    const stockInfo = await inventoryService.getCurrentStock();
    const oilStock    = stockInfo.oil;
    const carbonStock = stockInfo.carbon;
    const steelStock  = stockInfo.steel;
    const gasStock    = stockInfo.gas;
    const rawTyre     = stockInfo.rawTyre;
    const tyreStock   = stockInfo.tyres;
    const tyreDataGap = stockInfo.tyreDataGap;

    // Settings thresholds
    const [settingsRows] = await db.execute('SELECT setting_key, setting_value FROM settings');
    const cfg = {};
    settingsRows.forEach(s => { cfg[s.setting_key] = parseFloat(s.setting_value); });

    // Utilization %
    const util = utilRows[0];
    const utilPct = util.total > 0
      ? parseFloat(((parseFloat(util.completed) / parseFloat(util.total)) * 100).toFixed(1))
      : 0;

    // Production efficiency (all-time avg oil yield)
    const efficiencyPct = parseFloat(parseFloat(at.avg_yield || 0).toFixed(2));

    res.json({
      allTime: {
        oil:     parseFloat(at.oil),
        carbon:  parseFloat(at.carbon),
        steel:   parseFloat(at.steel),
        gas:     parseFloat(at.gas),
        tyres:   parseFloat(at.tyres),
        batches: parseInt(at.batch_count),
        avgYield: efficiencyPct
      },
      today: {
        oil:     parseFloat(todayRows[0].oil),
        carbon:  parseFloat(todayRows[0].carbon),
        steel:   parseFloat(todayRows[0].steel),
        gas:     parseFloat(todayRows[0].gas),
        tyres:   parseFloat(todayRows[0].tyres),
        batches: parseInt(todayRows[0].batches)
      },
      thisMonth: {
        oil:     parseFloat(thisMonthRows[0].oil),
        carbon:  parseFloat(thisMonthRows[0].carbon),
        steel:   parseFloat(thisMonthRows[0].steel),
        gas:     parseFloat(thisMonthRows[0].gas),
        tyres:   parseFloat(thisMonthRows[0].tyres),
        batches: parseInt(thisMonthRows[0].batches)
      },
      monthly,
      daily,
      stock: {
        oil: oilStock, carbon: carbonStock,
        steel: steelStock, gas: gasStock,
        tyres: rawTyre, tyreDataGap
      },
      utilization: {
        total:      parseInt(util.total),
        completed:  parseInt(util.completed),
        inProgress: parseInt(util.in_progress),
        planned:    parseInt(util.planned),
        percentage: utilPct
      },
      efficiency: efficiencyPct,
      thresholds: {
        oil:    cfg['OIL_LIMIT']    || 500,
        carbon: cfg['CARBON_LIMIT'] || 500,
        tyres:  cfg['TYRE_LIMIT']   || 1000
      }
    });
  } catch (err) {
    console.error('Production KPIs error:', err);
    res.status(500).json({ message: 'Failed to fetch production KPIs' });
  }
};

// ── NEW: Search Telemetry endpoint ─────────────────────────────────────────────
exports.searchTelemetry = async (req, res) => {
  try {
    const term = req.query.q || '';
    if (!term || term.trim() === '') {
      return res.json({ results: [] });
    }
    const safeTerm = `%${term}%`;
    const results = [];

    // Search Customers
    const [customers] = await db.execute(`SELECT name, phone FROM customers WHERE name LIKE ?`, [safeTerm]);
    customers.forEach(c => results.push({ type: 'Customer', name: c.name, details: c.phone || 'N/A', url: '/customers.html' }));

    // Search Invoices
    const [invoices] = await db.execute(`SELECT invoice_number, customer_name, total_amount, payment_status FROM invoices WHERE invoice_number LIKE ? OR customer_name LIKE ?`, [safeTerm, safeTerm]);
    invoices.forEach(i => results.push({ type: 'Invoice', name: i.invoice_number, details: `${i.customer_name} - ₹${i.total_amount} (${i.payment_status})`, url: '/invoice.html' }));

    // Search Batches
    const [batches] = await db.execute(`SELECT batch_number, status FROM batches WHERE batch_number LIKE ?`, [safeTerm]);
    batches.forEach(b => results.push({ type: 'Batch', name: b.batch_number, details: b.status, url: '/reports.html' }));

    // Search Inventory
    const [inventory] = await db.execute(`
      SELECT i.type as material_type, s.name as supplier_name, i.weight 
      FROM inventory i 
      LEFT JOIN suppliers s ON i.supplier_id = s.id 
      WHERE i.type LIKE ? OR s.name LIKE ?
    `, [safeTerm, safeTerm]);
    inventory.forEach(inv => results.push({ type: 'Inventory', name: inv.material_type, details: `${inv.supplier_name || 'Unknown Supplier'} - ${inv.weight}kg`, url: '/reports.html' }));

    // Search Expenses
    const [expenses] = await db.execute(`SELECT type, amount, date FROM expenses WHERE type LIKE ? OR amount LIKE ?`, [safeTerm, safeTerm]);
    expenses.forEach(e => results.push({ type: 'Expense', name: e.type, details: `₹${e.amount} on ${e.date}`, url: '/reports.html' }));

    // Search Suppliers
    const [suppliers] = await db.execute(`SELECT name, contact FROM suppliers WHERE name LIKE ? OR contact LIKE ?`, [safeTerm, safeTerm]);
    suppliers.forEach(s => results.push({ type: 'Supplier', name: s.name, details: s.contact || 'N/A', url: '/reports.html' }));

    res.json({ results });
  } catch (err) {
    console.error('Search telemetry error:', err);
    res.status(500).json({ message: 'Failed to search telemetry' });
  }
};