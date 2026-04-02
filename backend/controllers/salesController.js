const Sales = require('../models/salesModel');

exports.getSales = async (req, res) => {
    try {
        const sales = await Sales.getAll();
        res.status(200).json({ success: true, data: sales });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSale = async (req, res) => {
    try {
        const sale = await Sales.getById(req.params.id);
        if (!sale) {
            return res.status(404).json({ success: false, message: 'Sale record not found' });
        }
        res.status(200).json({ success: true, data: sale });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createSale = async (req, res) => {
    try {
        const { product_type, quantity, price_per_unit, buyer, date } = req.body;
        if (!product_type || !quantity || !price_per_unit || !buyer || !date) {
            return res.status(400).json({ success: false, message: 'Please provide all requirements: product_type, quantity, price_per_unit, buyer, date' });
        }
        
        const newId = await Sales.create({ product_type, quantity, price_per_unit, buyer, date });
        const newSale = await Sales.getById(newId);
        
        res.status(201).json({ success: true, data: newSale });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateSale = async (req, res) => {
    try {
        const affectedRows = await Sales.update(req.params.id, req.body);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Sale record not found' });
        }
        
        const updatedSale = await Sales.getById(req.params.id);
        res.status(200).json({ success: true, data: updatedSale });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteSale = async (req, res) => {
    try {
        const affectedRows = await Sales.delete(req.params.id);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Sale record not found' });
        }
        
        res.status(200).json({ success: true, message: 'Sale record removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
