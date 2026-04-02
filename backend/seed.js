const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

async function seed() {
    console.log('Starting execution of database seeding...');
    
    let connection;
    try {
        // Connect to MySQL server without selecting a specific database first
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });

        const sqlFilePath = path.join(__dirname, 'database.sql');
        const sqlSchema = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('Running schema update...');
        await connection.query(sqlSchema);

        // Switch context to newly created/updated DB
        await connection.query(`USE ${process.env.DB_NAME}`);

        console.log('Checking for admin user...');
        const [users] = await connection.query('SELECT * FROM users WHERE email = ?', ['admin@example.com']);
        
        if (users.length === 0) {
            console.log('Creating default admin user...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            await connection.query(
                "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'Admin')",
                ['Administrator', 'admin@example.com', hashedPassword]
            );
            console.log("Admin user created (email: admin@example.com, pass: admin123)");
        } else {
            console.log('Admin user already exists.');
        }

        console.log('Database seeded successfully!');
    } catch (error) {
        console.error('Error seeding the database: ', error);
    } finally {
        if (connection) {
            await connection.end();
        }
        process.exit();
    }
}

seed();
