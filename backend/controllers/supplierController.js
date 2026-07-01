const db = require('../config/db');
const Supplier = require('../models/supplierModel');

// ── Shared validation ──────────────────────────────────────────────────────────
const PHONE_REGEX = /^\d{10}$/;

function validateSupplierPayload(body) {
  const errors = [];
  const { name, contact } = body;

  if (!name || !name.trim()) {
    errors.push('Supplier name is required.');
  }

  if (!contact || !contact.trim()) {
    errors.push('Phone number is required.');
  } else if (!PHONE_REGEX.test(contact.trim())) {
    errors.push('Enter a valid 10-digit phone number.');
  }

  return errors;
}

// GET suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM suppliers ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error fetching suppliers' });
  }
};

// CREATE supplier
exports.createSupplier = async (req, res) => {
  try {
    const { name, contact, location } = req.body;

    // 1. Field-level validation
    const errors = validateSupplierPayload(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    // 2. Case-insensitive duplicate check
    const existing = await Supplier.findByName(name.trim());
    if (existing) {
      return res.status(409).json({ success: false, message: 'Supplier already exists.' });
    }

    // 3. Insert
    const newId = await Supplier.create({ name: name.trim(), contact: contact.trim(), location });
    const newSupplier = await Supplier.getById(newId);

    res.status(201).json({ success: true, message: 'Supplier added', data: newSupplier });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error adding supplier' });
  }
};

// UPDATE supplier (optional — guards against duplicate rename)
exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact, location } = req.body;

    // 1. Field-level validation
    const errors = validateSupplierPayload(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    // 2. Case-insensitive duplicate check (exclude self)
    const existing = await Supplier.findByName(name.trim(), id);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Supplier already exists.' });
    }

    const affected = await Supplier.update(id, { name: name.trim(), contact: contact.trim(), location });
    if (affected === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const updated = await Supplier.getById(id);
    res.json({ success: true, message: 'Supplier updated', data: updated });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error updating supplier' });
  }
};

// DELETE supplier
exports.deleteSupplier = async (req, res) => {
  try {
    const affectedRows = await Supplier.delete(req.params.id);
    if (affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.json({ success: true, message: 'Supplier removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error removing supplier' });
  }
};
