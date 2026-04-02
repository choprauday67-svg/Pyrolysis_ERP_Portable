const Settings = require('../models/settingsModel');

exports.getSettings = async (req, res) => {
    try {
        const allSettings = await Settings.getAll();
        const data = {};
        allSettings.forEach(setting => {
            data[setting.setting_key] = setting.setting_value;
        });
        
        // For backwards compatibility, map common keys to legacy style
        data.tyre_limit = data.TYRE_LIMIT ? Number(data.TYRE_LIMIT) : null;
        data.oil_limit = data.OIL_LIMIT ? Number(data.OIL_LIMIT) : null;
        data.carbon_limit = data.CARBON_LIMIT ? Number(data.CARBON_LIMIT) : null;
        data.oil_price = data.OIL_PRICE ? Number(data.OIL_PRICE) : null;
        data.carbon_price = data.CARBON_PRICE ? Number(data.CARBON_PRICE) : null;
        data.steel_price = data.STEEL_PRICE ? Number(data.STEEL_PRICE) : null;

        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error fetching settings" });
    }
};

exports.saveLimits = async (req, res) => {
    try {
        const { tyre, oil, carbon } = req.body;
        const tyreLimit = Number(tyre);
        const oilLimit = Number(oil);
        const carbonLimit = Number(carbon);

        if (Number.isNaN(tyreLimit) || Number.isNaN(oilLimit) || Number.isNaN(carbonLimit)) {
            return res.status(400).json({ success: false, message: "Invalid limits values" });
        }

        await Settings.update('TYRE_LIMIT', tyreLimit.toString());
        await Settings.update('OIL_LIMIT', oilLimit.toString());
        await Settings.update('CARBON_LIMIT', carbonLimit.toString());

        res.json({ success: true, message: "Stock limits saved successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error saving limits to database" });
    }
};

exports.savePrices = async (req, res) => {
    try {
        const { oil, carbon, steel } = req.body;
        const oilPrice = Number(oil);
        const carbonPrice = Number(carbon);
        const steelPrice = Number(steel);

        if (Number.isNaN(oilPrice) || Number.isNaN(carbonPrice) || Number.isNaN(steelPrice)) {
            return res.status(400).json({ success: false, message: "Invalid price values" });
        }

        await Settings.update('OIL_PRICE', oilPrice.toString());
        await Settings.update('CARBON_PRICE', carbonPrice.toString());
        await Settings.update('STEEL_PRICE', steelPrice.toString());

        res.json({ success: true, message: "Material prices saved successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error saving prices to database" });
    }
};
