const Inventory = require('../models/inventoryModel');

exports.getInventories = async (req, res) => {
    try {
        const inventories = await Inventory.getAll();
        res.status(200).json({ success: true, data: inventories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInventory = async (req, res) => {
    try {
        const inventory = await Inventory.getById(req.params.id);
        if (!inventory) {
            return res.status(404).json({ success: false, message: 'Inventory entry not found' });
        }
        res.status(200).json({ success: true, data: inventory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createInventory = async (req, res) => {
    try {
        const { supplier_id, weight, type, date } = req.body;
        if (!weight || !type || !date) {
            return res.status(400).json({ success: false, message: 'Please provide weight, type, and date' });
        }
        
        const newId = await Inventory.create({ supplier_id, weight, type, date });
        const newInventory = await Inventory.getById(newId);
        
        res.status(201).json({ success: true, data: newInventory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateInventory = async (req, res) => {
    try {
        const affectedRows = await Inventory.update(req.params.id, req.body);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Inventory entry not found' });
        }
        
        const updatedInventory = await Inventory.getById(req.params.id);
        res.status(200).json({ success: true, data: updatedInventory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteInventory = async (req, res) => {
    try {
        const affectedRows = await Inventory.delete(req.params.id);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Inventory entry not found' });
        }
        
        res.status(200).json({ success: true, message: 'Inventory entry removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInventorySummary = async (req, res) => {
    try {
        const summary = await Inventory.getTotalSummary();
        res.status(200).json({ success: true, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
