const Production = require('../models/productionModel');

exports.getProductions = async (req, res) => {
    try {
        const productions = await Production.getAll();
        res.status(200).json({ success: true, data: productions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProduction = async (req, res) => {
    try {
        const production = await Production.getById(req.params.id);
        if (!production) {
            return res.status(404).json({ success: false, message: 'Production batch not found' });
        }
        res.status(200).json({ success: true, data: production });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createProduction = async (req, res) => {
    try {
        const { input_weight, oil_output, carbon_output, steel_output, date } = req.body;
        if (!input_weight || !oil_output || !date) {
            return res.status(400).json({ success: false, message: 'Please provide at least input_weight, oil_output, and date' });
        }
        
        const newId = await Production.create({
            input_weight,
            oil_output,
            carbon_output: carbon_output || 0,
            steel_output: steel_output || 0,
            date
        });
        const newProduction = await Production.getById(newId);
        
        res.status(201).json({ success: true, data: newProduction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateProduction = async (req, res) => {
    try {
        const affectedRows = await Production.update(req.params.id, req.body);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Production batch not found' });
        }
        
        const updatedProduction = await Production.getById(req.params.id);
        res.status(200).json({ success: true, data: updatedProduction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteProduction = async (req, res) => {
    try {
        const affectedRows = await Production.delete(req.params.id);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Production batch not found' });
        }
        
        res.status(200).json({ success: true, message: 'Production batch removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
