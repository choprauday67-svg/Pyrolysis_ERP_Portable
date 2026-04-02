const Expense = require('../models/expenseModel');

exports.getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.getAll();
        res.status(200).json({ success: true, data: expenses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getExpense = async (req, res) => {
    try {
        const expense = await Expense.getById(req.params.id);
        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense record not found' });
        }
        res.status(200).json({ success: true, data: expense });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createExpense = async (req, res) => {
    try {
        const { type, amount, date } = req.body;
        if (!type || !amount || !date) {
            return res.status(400).json({ success: false, message: 'Please provide type, amount, and date' });
        }
        
        const newId = await Expense.create({ type, amount, date });
        const newExpense = await Expense.getById(newId);
        
        res.status(201).json({ success: true, data: newExpense });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateExpense = async (req, res) => {
    try {
        const affectedRows = await Expense.update(req.params.id, req.body);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Expense record not found' });
        }
        
        const updatedExpense = await Expense.getById(req.params.id);
        res.status(200).json({ success: true, data: updatedExpense });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteExpense = async (req, res) => {
    try {
        const affectedRows = await Expense.delete(req.params.id);
        if (affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Expense record not found' });
        }
        
        res.status(200).json({ success: true, message: 'Expense record removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
