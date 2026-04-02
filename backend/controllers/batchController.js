const Batch = require('../models/batchModel');

exports.getBatches = async (req, res) => {
    try {
        const batches = await Batch.getAll();
        res.status(200).json({ success: true, data: batches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getBatch = async (req, res) => {
    try {
        const batch = await Batch.getById(req.params.id);
        if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
        res.status(200).json({ success: true, data: batch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createBatch = async (req, res) => {
    try {
        const { batch_number, input_tyres, status, start_time, date } = req.body;
        
        if (!input_tyres || input_tyres <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid or missing Input Weight (Tyres)' });
        }

        if (status && !['Planned', 'In-Progress', 'Completed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid batch status' });
        }

        const newId = await Batch.create({
            batch_number: batch_number || `BATCH-${Date.now()}`,
            input_tyres,
            status: status || 'Planned',
            start_time: start_time || (status === 'In-Progress' ? new Date() : null),
            date: date || new Date()
        });

        const newBatch = await Batch.getById(newId);
        res.status(201).json({ success: true, data: newBatch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateBatch = async (req, res) => {
    try {
        const data = req.body;
        
        // Auto-set end_time if status changed to Completed
        if (data.status === 'Completed' && !data.end_time) {
            data.end_time = new Date();
        }

        const affectedRows = await Batch.update(req.params.id, data);
        if (affectedRows === 0) return res.status(404).json({ success: false, message: 'Batch not found' });

        const updatedBatch = await Batch.getById(req.params.id);
        res.status(200).json({ success: true, data: updatedBatch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteBatch = async (req, res) => {
    try {
        const affectedRows = await Batch.delete(req.params.id);
        if (affectedRows === 0) return res.status(404).json({ success: false, message: 'Batch not found' });
        res.status(200).json({ success: true, message: 'Batch deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
