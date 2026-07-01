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
        data.energy_value = data.ENERGY_VALUE ? Number(data.ENERGY_VALUE) : null;

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
        if (tyreLimit <= 0 || oilLimit <= 0 || carbonLimit <= 0) {
            return res.status(400).json({ success: false, message: "Limits must be strictly greater than zero." });
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
        const { oil, carbon, steel, energy } = req.body;
        console.log("--- savePrices Payload ---");
        console.log("req.body:", req.body);
        
        const oilPrice = Number(oil);
        const carbonPrice = Number(carbon);
        const steelPrice = Number(steel);
        
        console.log("Parsed values:", { oilPrice, carbonPrice, steelPrice, energyRaw: energy });
        
        if (Number.isNaN(oilPrice) || Number.isNaN(carbonPrice) || Number.isNaN(steelPrice)) {
            console.log("Validation failed: NaN detected among oil, carbon, or steel");
            return res.status(400).json({ success: false, message: "Invalid price values" });
        }
        if (oilPrice <= 0 || carbonPrice <= 0 || steelPrice <= 0) {
            console.log("Validation failed: oil, carbon, or steel <= 0");
            return res.status(400).json({ success: false, message: "Prices and values must be strictly greater than zero." });
        }

        let energyValue = null;
        if (energy !== undefined) {
            energyValue = Number(energy);
            if (Number.isNaN(energyValue) || energyValue <= 0) {
                console.log("Validation failed: energy is NaN or <= 0");
                return res.status(400).json({ success: false, message: "Invalid energy value" });
            }
        }

        await Settings.update('OIL_PRICE', oilPrice.toString());
        await Settings.update('CARBON_PRICE', carbonPrice.toString());
        await Settings.update('STEEL_PRICE', steelPrice.toString());
        
        if (energyValue !== null) {
            await Settings.update('ENERGY_VALUE', energyValue.toString());
        }

        res.json({ success: true, message: "Material prices saved successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error saving prices to database" });
    }
};

exports.bulkSave = async (req, res) => {
    try {
        const { settings } = req.body;
        if (!Array.isArray(settings)) {
            return res.status(400).json({ success: false, message: "Invalid settings format" });
        }
        for (const s of settings) {
            await Settings.update(s.setting_key, s.setting_value.toString());
        }
        res.json({ success: true, message: "Settings saved successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Error saving settings" });
    }
};
