const Rates = require('../models/ratesModel');

exports.getRates = async (req, res) => {
    try {
        const rates = await Rates.getAll();
        res.json({ success: true, data: rates });
    } catch (err) {
        res.status(500).json({ message: "Error fetching rates" });
    }
};

exports.updateRate = async (req, res) => {
    const { product_type, unit_price } = req.body;
    try {
        await Rates.update(product_type, unit_price);
        res.json({ success: true, message: `Price for ${product_type} updated to ₹${unit_price}` });
    } catch (err) {
        res.status(500).json({ message: "Error updating rate" });
    }
};
