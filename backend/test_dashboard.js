const db = require('./config/db');
const dashboardController = require('./controllers/dashboardController');

async function test() {
    // mock req, res
    let jsonResult = null;
    const res = {
        json: (data) => { jsonResult = data; },
        status: () => res
    };

    console.log('--- BEFORE PLANNED BATCH ---');
    await dashboardController.getDashboardStats({}, res);
    console.log('currentStock:', jsonResult.summary.currentStock);

    const [insert] = await db.execute(
        'INSERT INTO batches (batch_number, input_tyres, status, date) VALUES (?, ?, ?, ?)',
        [`TEST-${Date.now()}`, 5000, 'Planned', new Date()]
    );
    const id = insert.insertId;

    console.log('--- AFTER PLANNED BATCH ---');
    await dashboardController.getDashboardStats({}, res);
    console.log('currentStock:', jsonResult.summary.currentStock);

    await db.execute('DELETE FROM batches WHERE id = ?', [id]);
    process.exit(0);
}
test();
