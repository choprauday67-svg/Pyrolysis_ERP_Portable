const db = require('./config/db');
async function r() {
    const [rows] = await db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='suppliers'");
    console.log('Schema:', rows[0] ? rows[0].sql : 'NOT FOUND');
    
    const [existing] = await db.execute("SELECT id, name, contact FROM suppliers LIMIT 10");
    console.log('\nExisting suppliers:');
    console.table(existing);
    process.exit(0);
}
r().catch(e => { console.error(e); process.exit(1); });
