const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

async function seed() {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database for stress test.');

    try {
        // 1. Bulk Inventory (Tyres)
        console.log('--- Seeding Inventory (500 records) ---');
        for (let i = 0; i < 500; i++) {
            const weight = (Math.random() * 2000 + 500).toFixed(2);
            const type = ['Truck', 'Car', 'Mixed'][Math.floor(Math.random() * 3)];
            const date = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const supplierId = Math.floor(Math.random() * 2) + 1; // Assuming 1 or 2 exist
            await connection.execute(
                'INSERT INTO inventory (supplier_id, weight, type, date) VALUES (?, ?, ?, ?)',
                [supplierId, weight, type, date]
            );
        }

        // 2. Bulk Production (Logs)
        console.log('--- Seeding Production (300 records) ---');
        for (let i = 0; i < 300; i++) {
            const inputWeight = (Math.random() * 5000 + 1000).toFixed(2);
            const oil = (inputWeight * 0.44).toFixed(2);
            const carbon = (inputWeight * 0.35).toFixed(2);
            const steel = (inputWeight * 0.15).toFixed(2);
            const date = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            await connection.execute(
                'INSERT INTO production (input_weight, oil_output, carbon_output, steel_output, date) VALUES (?, ?, ?, ?, ?)',
                [inputWeight, oil, carbon, steel, date]
            );
        }

        // 3. Bulk Sales
        console.log('--- Seeding Sales (400 records) ---');
        const buyers = ['Energy Corp', 'Rubber Makers Ltd', 'Metal Recyclers', 'Local Fuel Hub', 'Global Polymers'];
        for (let i = 0; i < 400; i++) {
            const type = ['Oil', 'Carbon Black', 'Steel'][Math.floor(Math.random() * 3)];
            const quantity = (Math.random() * 1000 + 100).toFixed(2);
            const price = type === 'Oil' ? 0.85 : type === 'Carbon Black' ? 0.50 : 0.30;
            const buyer = buyers[Math.floor(Math.random() * buyers.length)];
            const date = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            await connection.execute(
                'INSERT INTO sales (product_type, quantity, price_per_unit, buyer, date) VALUES (?, ?, ?, ?, ?)',
                [type, quantity, price, buyer, date]
            );
        }

        console.log('🚀 STRESS TEST SEEDING COMPLETE');
    } catch (err) {
        console.error('❌ SEEDING FAILED:', err);
    } finally {
        await connection.end();
    }
}

seed();
