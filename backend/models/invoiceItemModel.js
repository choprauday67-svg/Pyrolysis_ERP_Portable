const db = require('../config/db');

const InvoiceItem = {
  getByInvoiceId: async (invoiceId) => {
    const [rows] = await db.execute('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC', [invoiceId]);
    return rows;
  },

  create: async (data) => {
    const { invoice_id, product_description, quantity, rate, taxable_amount, cgst, sgst, igst, total_amount } = data;
    const [result] = await db.execute(
      `INSERT INTO invoice_items (invoice_id, product_description, quantity, rate, taxable_amount, cgst, sgst, igst, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoice_id, product_description, quantity, rate, taxable_amount, cgst, sgst, igst, total_amount]
    );
    return result.insertId;
  },

  deleteByInvoiceId: async (invoiceId) => {
    const [result] = await db.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
    return result.affectedRows;
  }
};

module.exports = InvoiceItem;
