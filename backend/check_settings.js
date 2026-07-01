const db = require('./config/db');

async function check() {
  try {
    const [rows] = await db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='settings'");
    console.log("Schema:", rows[0] ? rows[0].sql : "NOT FOUND");
    
    if (rows[0]) {
      const [data] = await db.execute("SELECT * FROM settings");
      console.log("Data:");
      console.table(data);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

check();
