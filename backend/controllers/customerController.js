const Customer = require('../models/customerModel');

exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.getAll();
    res.json({ success: true, customers });
  } catch (err) {
    console.error('Customer fetch error:', err);
    res.status(500).json({ success: false, message: 'Unable to read customer records' });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.getById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, customer });
  } catch (err) {
    console.error('Customer fetch error:', err);
    res.status(500).json({ success: false, message: 'Unable to read customer record' });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const { name, gst_number, address, phone } = req.body;
    if (!name || !gst_number || !address) {
      return res.status(400).json({ success: false, message: 'Name, GST number, and address are required' });
    }

    const customerId = await Customer.create({ name, gst_number, address, phone });
    res.status(201).json({ success: true, customerId });
  } catch (err) {
    console.error('Customer create error:', err);
    res.status(500).json({ success: false, message: 'Unable to create customer' });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { name, gst_number, address, phone } = req.body;
    if (!name || !gst_number || !address) {
      return res.status(400).json({ success: false, message: 'Name, GST number, and address are required' });
    }

    const affectedRows = await Customer.update(req.params.id, { name, gst_number, address, phone });
    if (!affectedRows) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, message: 'Customer updated' });
  } catch (err) {
    console.error('Customer update error:', err);
    res.status(500).json({ success: false, message: 'Unable to update customer' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const affectedRows = await Customer.delete(req.params.id);
    if (!affectedRows) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) {
    console.error('Customer delete error:', err);
    res.status(500).json({ success: false, message: 'Unable to delete customer' });
  }
};
