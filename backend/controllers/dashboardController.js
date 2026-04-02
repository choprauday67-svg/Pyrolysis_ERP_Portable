const Inventory = require('../models/inventoryModel');
const Batch = require('../models/batchModel');
const Sales = require('../models/salesModel');
const Expense = require('../models/expenseModel');
const Settings = require('../models/settingsModel');

exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Get Summary Stats
    const invSummary = await Inventory.getTotalSummary();
    const batchSummary = await Batch.getSummary();
    const totalRevenue = await Sales.getSummary();
    const totalExpenses = await Expense.getSummary();
    
    // 2. Get Strategy Insights
    const buyerStrategy = await Sales.getBuyerInsights();
    
    // 3. Check Alerts/Thresholds
    const allSettings = await Settings.getAll();
    const settingsMap = {};
    allSettings.forEach(s => settingsMap[s.setting_key] = s.setting_value);

    const tyreLimit = parseFloat(settingsMap['TYRE_LIMIT'] || settingsMap['MIN_STOCK_THRESHOLD'] || 1000);
    const oilLimit = parseFloat(settingsMap['OIL_LIMIT'] || 500);
    const carbonLimit = parseFloat(settingsMap['CARBON_LIMIT'] || 500);

    const salesCategories = await Sales.getCategorySummary();
    const soldMap = {};
    salesCategories.forEach(s => soldMap[s.product_type] = parseFloat(s.total_sold) || 0);

    const safeBatchTotalOil = batchSummary && batchSummary.total_oil ? parseFloat(batchSummary.total_oil) : 0;
    const safeBatchTotalCarbon = batchSummary && batchSummary.total_carbon ? parseFloat(batchSummary.total_carbon) : 0;

    const currentOilStock = safeBatchTotalOil - (soldMap['Oil'] || 0);
    const currentCarbonStock = safeBatchTotalCarbon - (soldMap['Carbon Black'] || 0);

    const alerts = [];
    if (invSummary.current_stock < tyreLimit) {
      alerts.push({ type: 'TYRE', message: `Low tyre stock: ${invSummary.current_stock}kg (Limit: ${tyreLimit}kg)` });
    }
    if (currentOilStock < oilLimit) {
      alerts.push({ type: 'OIL', message: `Low oil stock: ${currentOilStock.toFixed(2)}L (Limit: ${oilLimit}L)` });
    }
    if (currentCarbonStock < carbonLimit) {
      alerts.push({ type: 'CARBON', message: `Low carbon stock: ${currentCarbonStock.toFixed(2)}kg (Limit: ${carbonLimit}kg)` });
    }
    
    // 4. Calculate Net Profit
    const netProfit = totalRevenue - totalExpenses;

    // 5. Historical Data for Charts
    const batchesData = await Batch.getAll();
    
    res.json({
      summary: {
        currentStock: invSummary.current_stock,
        currentOilStock,
        currentCarbonStock,
        totalProduction: { 
          oil: batchSummary && batchSummary.total_oil ? parseFloat(batchSummary.total_oil) : 0,
          carbon: batchSummary && batchSummary.total_carbon ? parseFloat(batchSummary.total_carbon) : 0,
          steel: batchSummary && batchSummary.total_steel ? parseFloat(batchSummary.total_steel) : 0
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
      }
    });
  } catch (err) {
    console.error("Dashboard controller error:", err);
    res.status(500).json({ message: "Internal System Error during telemetry aggregation" });
  }
};