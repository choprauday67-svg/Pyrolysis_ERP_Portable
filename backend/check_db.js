const db = require('./config/db');
db.execute("SELECT name FROM sqlite_master WHERE type='table'")
  .then(([rows]) => {
    console.log('Tables:', rows.map(r => r.name).join(', '));
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
