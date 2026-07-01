const db = require('../config/db');

const Invoice = {
  getAll: async () => {
    const [rows] = await db.execute('SELECT * FROM invoices ORDER BY invoice_date DESC, id DESC');
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.execute('SELECT * FROM invoices WHERE id = ?', [id]);
    return rows[0];
  },

  getByNumber: async (invoiceNumber) => {
    const [rows] = await db.execute('SELECT * FROM invoices WHERE invoice_number = ?', [invoiceNumber]);
    return rows[0];
  },

  create: async (data) => {
    const {
      invoice_number,
      customer_id,
      customer_name,
      gst_number,
      address,
      phone,
      invoice_date,
      taxable_amount,
      cgst,
      sgst,
      igst,
      total_amount,
      payment_status
    } = data;

    const [result] = await db.execute(
      `INSERT INTO invoices
        (invoice_number, customer_id, customer_name, gst_number, address, phone, invoice_date, taxable_amount, cgst, sgst, igst, total_amount, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice_number,
        customer_id || null,
        customer_name,
        gst_number,
        address,
        phone,
        invoice_date,
        taxable_amount,
        cgst,
        sgst,
        igst,
        total_amount,
        payment_status
      ]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const fields = [];
    const values = [];

    const keys = [
      'customer_id',
      'customer_name',
      'gst_number',
      'address',
      'phone',
      'invoice_date',
      'taxable_amount',
      'cgst',
      'sgst',
      'igst',
      'total_amount',
      'payment_status'
    ];

    keys.forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });

    if (fields.length === 0) {
      return 0;
    }

    values.push(id);
    const [result] = await db.execute(`UPDATE invoices SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows;
  },

  delete: async (id) => {
    const [result] = await db.execute('DELETE FROM invoices WHERE id = ?', [id]);
    return result.affectedRows;
  },

  getLastInvoiceNumber: async () => {
    const [rows] = await db.execute('SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1');
    return rows[0] && rows[0].invoice_number ? rows[0].invoice_number : null;
  },

  getSalesGstSummary: async (fromDate, toDate) => {
    const conditions = [];
    const params = [];

    if (fromDate) {
      conditions.push("date(invoice_date) >= date(?)");
      params.push(fromDate);
    }
    if (toDate) {
      conditions.push("date(invoice_date) <= date(?)");
      params.push(toDate);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await db.execute(`
      SELECT invoice_number, invoice_date, customer_name, gst_number, taxable_amount, cgst, sgst, igst, total_amount, payment_status
      FROM invoices
      ${where}
      ORDER BY invoice_date DESC, invoice_number DESC
    `, params);
    return rows;
  }
};

module.exports = Invoice;
