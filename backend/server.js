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
app.use(express.static('./dist'));

// ✅ TEST ROUTE
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './dist/index.html'));
});

// ✅ ROUTES
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/rates', require('./routes/ratesRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/production', require('./routes/batchRoutes')); // Compatibility
app.use('/api/batches', require('./routes/batchRoutes'));      // New Standard
app.use('/api/sales', require('./routes/salesRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));

// TEST ENDPOINT
app.get('/api/health', (req, res) => res.json({ status: 'OK', routes: 'ACTIVE' }));

// ❌ HANDLE UNKNOWN ROUTES (SPA fallback)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            message: 'Route not found'
        });
    }
    res.sendFile(path.join(__dirname, './dist/index.html'));
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
const path = require("path");

// Serve frontend
app.use(express.static(path.join(__dirname, "dist"))); 
// or "frontend" if separate folder

// Handle React routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});
app.use(express.static(path.join(__dirname, "../frontend/dist")));