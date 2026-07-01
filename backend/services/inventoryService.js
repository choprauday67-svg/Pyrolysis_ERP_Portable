'use strict';

const db = require('../config/db');

/**
 * inventoryService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for all inventory calculations in Pyrolysis ERP.
 * 
 * Formula: Receipts (Purchases) + Production - Dispatches - Adjustments = Current Stock
 */

/**
 * Returns current inventory levels calculated from production minus sales.
 * Commodity stock = Σ batch outputs (Completed) − Σ sales quantities
 * Tyre stock      = Σ inventory receipts − Σ batch consumption
 */
async function getCurrentStock() {
  // Production totals from completed batches
  const [prodRows] = await db.execute(`
    SELECT
      COALESCE(SUM(oil_output),    0) AS oil,
      COALESCE(SUM(carbon_output), 0) AS carbon,
      COALESCE(SUM(steel_output),  0) AS steel,
      COALESCE(SUM(gas_output),    0) AS gas
    FROM batches WHERE status = 'Completed'
  `);
  const prod = prodRows[0];

  // Sales quantities per product type
  const [salesRows] = await db.execute(
    'SELECT product_type, COALESCE(SUM(quantity), 0) AS sold FROM sales GROUP BY product_type'
  );
  const sold = {};
  salesRows.forEach(s => { sold[s.product_type] = Number(s.sold || 0); });

  const oil    = Math.max(0, Number(prod.oil)    - (sold['Oil']          || 0));
  const carbon = Math.max(0, Number(prod.carbon) - (sold['Carbon Black'] || 0));
  const steel  = Math.max(0, Number(prod.steel)  - (sold['Steel Wire']   || sold['Steel'] || 0));
  const gas    = Math.max(0, Number(prod.gas)    - (sold['Gas']          || 0));

  // Tyre stock
  const [invRow]  = await db.execute('SELECT COALESCE(SUM(weight),      0) AS total_in   FROM inventory');
  const [usedRow] = await db.execute(
    "SELECT COALESCE(SUM(input_tyres), 0) AS total_used FROM batches WHERE status IN ('In-Progress','Completed')"
  );
  const rawTyre    = Number(invRow[0].total_in) - Number(usedRow[0].total_used);
  const tyres      = Math.max(0, rawTyre);
  const tyreDataGap = rawTyre < 0;

  return { oil, carbon, steel, gas, tyres, tyreDataGap, rawTyre };
}

/**
 * Returns a complete inventory reconciliation view showing opening stock, production, dispatches, and current stock.
 */
async function getReconciliation() {
    const [prodRows] = await db.execute(`
        SELECT
            COALESCE(SUM(oil_output),    0) AS oil,
            COALESCE(SUM(carbon_output), 0) AS carbon,
            COALESCE(SUM(steel_output),  0) AS steel,
            COALESCE(SUM(gas_output),    0) AS gas
        FROM batches WHERE status = 'Completed'
    `);
    const prod = prodRows[0];

    const [salesRows] = await db.execute(
        'SELECT product_type, COALESCE(SUM(quantity), 0) AS sold FROM sales GROUP BY product_type'
    );
    const sold = {};
    salesRows.forEach(s => { sold[s.product_type] = Number(s.sold || 0); });

    const [invRow]  = await db.execute('SELECT COALESCE(SUM(weight), 0) AS total_in FROM inventory');
    const [usedRow] = await db.execute("SELECT COALESCE(SUM(input_tyres), 0) AS total_used FROM batches WHERE status IN ('In-Progress','Completed')");

    const tyresIn = Number(invRow[0].total_in);
    const tyresUsed = Number(usedRow[0].total_used);

    return {
        tyres: {
            receipts: tyresIn,
            consumed: tyresUsed,
            current_stock: Math.max(0, tyresIn - tyresUsed),
            discrepancy: (tyresIn - tyresUsed) < 0 ? Math.abs(tyresIn - tyresUsed) : 0
        },
        commodities: [
            { name: 'Oil', produced: Number(prod.oil), dispatched: (sold['Oil'] || 0), current_stock: Math.max(0, Number(prod.oil) - (sold['Oil'] || 0)) },
            { name: 'Carbon Black', produced: Number(prod.carbon), dispatched: (sold['Carbon Black'] || 0), current_stock: Math.max(0, Number(prod.carbon) - (sold['Carbon Black'] || 0)) },
            { name: 'Steel Wire', produced: Number(prod.steel), dispatched: (sold['Steel Wire'] || sold['Steel'] || 0), current_stock: Math.max(0, Number(prod.steel) - (sold['Steel Wire'] || sold['Steel'] || 0)) },
            { name: 'Gas', produced: Number(prod.gas), dispatched: (sold['Gas'] || 0), current_stock: Math.max(0, Number(prod.gas) - (sold['Gas'] || 0)) }
        ]
    };
}

module.exports = {
  getCurrentStock,
  getReconciliation
};
