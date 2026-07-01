const assert = require('assert');

const baseURL = 'http://localhost:5000/api';

async function request(method, path, body) {
    const res = await fetch(baseURL + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    return res.json();
}

async function runTests() {
    console.log('🔄 Starting Inventory Consumption Regression Test...');
    
    // Get initial tyre stock
    let initialStats = await request('GET', '/inventory/summary');
    let initialStock = initialStats.data.current_stock;
    console.log(`Initial Tyre Stock: ${initialStock}`);

    // 1. Create a Planned Batch
    console.log('\\n📝 Testing Planned Batch...');
    let res = await request('POST', '/batches', {
        batch_number: `TEST-PLANNED-${Date.now()}`,
        input_tyres: 100,
        status: 'Planned'
    });
    let plannedBatchId = res.data.id;
    
    let statsAfterPlanned = await request('GET', '/inventory/summary');
    let stockAfterPlanned = statsAfterPlanned.data.current_stock;
    
    if (stockAfterPlanned === initialStock) {
        console.log('✅ PASS: Planned batch did NOT consume inventory.');
    } else {
        console.error(`❌ FAIL: Stock changed from ${initialStock} to ${stockAfterPlanned}`);
    }

    // 2. Change Planned to In-Progress
    console.log('\\n⚙️ Testing In-Progress Batch...');
    await request('PUT', `/batches/${plannedBatchId}`, {
        status: 'In-Progress'
    });

    let statsAfterProgress = await request('GET', '/inventory/summary');
    let stockAfterProgress = statsAfterProgress.data.current_stock;

    if (stockAfterProgress === initialStock - 100) {
        console.log('✅ PASS: In-Progress batch consumed inventory correctly.');
    } else {
        console.error(`❌ FAIL: Stock is ${stockAfterProgress}, expected ${initialStock - 100}`);
    }

    // 3. Change In-Progress to Completed
    console.log('\\n✅ Testing Completed Batch...');
    await request('PUT', `/batches/${plannedBatchId}`, {
        status: 'Completed',
        oil_output: 40,
        carbon_output: 30,
        steel_output: 10,
        gas_output: 20
    });

    let statsAfterCompleted = await request('GET', '/inventory/summary');
    let stockAfterCompleted = statsAfterCompleted.data.current_stock;

    if (stockAfterCompleted === initialStock - 100) {
        console.log('✅ PASS: Completed batch maintained correct inventory consumption.');
    } else {
        console.error(`❌ FAIL: Stock is ${stockAfterCompleted}, expected ${initialStock - 100}`);
    }

    // Clean up
    console.log('\\n🧹 Cleaning up test batch...');
    await request('DELETE', `/batches/${plannedBatchId}`);
    
    let finalStats = await request('GET', '/inventory/summary');
    if (finalStats.data.current_stock === initialStock) {
        console.log('✅ PASS: Cleanup restored inventory.');
    }
    
    console.log('\\n🎉 All tests completed successfully!');
}

runTests().catch(err => {
    console.error('Test Failed:', err);
});
