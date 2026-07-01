const db = require('./config/db');
async function check() {
  const [res] = await db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='inventory'");
  console.log(res[0].sql);
  process.exit(0);
}
check().catch(e => { console.error(e.message); process.exit(1); });
