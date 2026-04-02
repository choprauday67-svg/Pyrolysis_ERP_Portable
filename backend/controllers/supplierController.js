const db = require('../config/db');
const Supplier = require('../models/supplierModel');

// GET suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM suppliers ORDER BY id DESC");
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching suppliers" });
  }
};

// CREATE supplier
exports.createSupplier = async (req, res) => {
  try {
    const { name, contact, location } = req.body;

    await db.query(
      "INSERT INTO suppliers (name, contact, location) VALUES (?, ?, ?)",
      [name, contact, location]
    );

    res.json({ success: true, message: "Supplier added" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error adding supplier" });
  }
};
// DELETE supplier
exports.deleteSupplier = async (req, res) => {
  try {
    const affectedRows = await Supplier.delete(req.params.id);
    if (affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }
    res.json({ success: true, message: "Supplier removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error removing supplier" });
  }
};
