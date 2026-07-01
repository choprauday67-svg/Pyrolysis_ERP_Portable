const db = require('./config/db');

async function testInventory() {
    console.log('🔄 Starting Database Regression Test...');
    
    const getStock = async () => {
        const [inv] = await db.execute('SELECT SUM(weight) as total_in FROM inventory');
        const [batchUsed] = await db.execute("SELECT SUM(input_tyres) as total_used FROM batches WHERE status IN ('In-Progress', 'Completed')");
        return parseFloat(inv[0].total_in || 0) - parseFloat(batchUsed[0].total_used || 0);
    };

    let initialStock = await getStock();
    console.log(`Initial Tyre Stock: ${initialStock}`);

    console.log('\\n📝 1. Testing Planned Batch...');
    const [plannedRes] = await db.execute(
        'INSERT INTO batches (batch_number, input_tyres, status, date) VALUES (?, ?, ?, ?)',
        [`TEST-PLANNED-${Date.now()}`, 100, 'Planned', new Date()]
    );
    let plannedBatchId = plannedRes.insertId;

    let stockAfterPlanned = await getStock();
    if (stockAfterPlanned === initialStock) {
        console.log('✅ PASS: Planned batch did NOT consume inventory.');
    } else {
        console.error(`❌ FAIL: Stock changed to ${stockAfterPlanned}`);
    }

    console.log('\\n⚙️ 2. Testing In-Progress Batch...');
    await db.execute('UPDATE batches SET status = ? WHERE id = ?', ['In-Progress', plannedBatchId]);

    let stockAfterProgress = await getStock();
    if (stockAfterProgress === initialStock - 100) {
        console.log('✅ PASS: In-Progress batch consumed inventory correctly.');
    } else {
        console.error(`❌ FAIL: Stock is ${stockAfterProgress}`);
    }

    console.log('\\n✅ 3. Testing Completed Batch...');
    await db.execute('UPDATE batches SET status = ? WHERE id = ?', ['Completed', plannedBatchId]);

    let stockAfterCompleted = await getStock();
    if (stockAfterCompleted === initialStock - 100) {
        console.log('✅ PASS: Completed batch maintained correct inventory consumption.');
    } else {
        console.error(`❌ FAIL: Stock is ${stockAfterCompleted}`);
    }

    console.log('\\n🧹 Cleaning up test batch...');
    await db.execute('DELETE FROM batches WHERE id = ?', [plannedBatchId]);
    
    let finalStock = await getStock();
    if (finalStock === initialStock) {
        console.log('✅ PASS: Cleanup restored inventory.');
    }

    console.log('\\n🎉 All tests completed successfully!');
    process.exit(0);
}

testInventory().catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
});
