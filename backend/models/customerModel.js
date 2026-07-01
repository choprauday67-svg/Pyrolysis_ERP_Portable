const db = require('../config/db');

const Customer = {
  getAll: async () => {
    const [rows] = await db.execute('SELECT * FROM customers ORDER BY name ASC');
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.execute('SELECT * FROM customers WHERE id = ?', [id]);
    return rows[0];
  },

  create: async (data) => {
    const { name, gst_number, address, phone } = data;
    const [result] = await db.execute(
      'INSERT INTO customers (name, gst_number, address, phone) VALUES (?, ?, ?, ?)',
      [name, gst_number, address, phone]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const { name, gst_number, address, phone } = data;
    const [result] = await db.execute(
      'UPDATE customers SET name = ?, gst_number = ?, address = ?, phone = ? WHERE id = ?',
      [name, gst_number, address, phone, id]
    );
    return result.affectedRows;
  },

  delete: async (id) => {
    const [result] = await db.execute('DELETE FROM customers WHERE id = ?', [id]);
    return result.affectedRows;
  },

  findByGst: async (gstNumber) => {
    const [rows] = await db.execute('SELECT * FROM customers WHERE gst_number = ?', [gstNumber]);
    return rows[0];
  }
};

module.exports = Customer;
