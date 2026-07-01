const db = require('./config/db');
async function test() {
    console.log(await db.execute('SELECT SUM(weight) as w FROM inventory'));
    console.log(await db.execute("SELECT SUM(input_tyres) as sum1 FROM batches WHERE status IN ('In-Progress', 'Completed')"));
    console.log(await db.execute("SELECT SUM(input_tyres) as sum2 FROM batches"));
    process.exit();
}
test();
