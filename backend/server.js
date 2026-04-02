const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// ✅ CORS CONFIG
app.use(cors({
    origin: true, // Allow all origins for portable version
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// ✅ BODY PARSER
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ SERVE STATIC FILES (FRONTEND)
app.use(express.static(path.join(__dirname, 'dist')));

// ✅ ROUTES
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/rates', require('./routes/ratesRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/production', require('./routes/batchRoutes'));
app.use('/api/batches', require('./routes/batchRoutes'));
app.use('/api/sales', require('./routes/salesRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));

// ✅ HEALTH CHECK
app.get('/api/health', (req, res) => res.json({ status: 'OK', routes: 'ACTIVE' }));

// ✅ SPA FALLBACK
app.get('/{*path}', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, message: 'Route not found' });
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ✅ GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error("🔥 ERROR:", err.stack);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// ✅ START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
