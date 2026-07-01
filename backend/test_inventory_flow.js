const http = require('http');
const jwt = require('jsonwebtoken');

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        require('dotenv').config();
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Authorization': `Bearer ${jwt.sign({ id: 1, role: 'Admin' }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1d' })}`,
                'Content-Type': 'application/json'
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    console.log('🔄 Starting Full API Runtime Test...');
    
    // 1. Get initial stock
    let stats1 = await request('GET', '/api/dashboard/stats');
    let initialStock = stats1.summary.currentStock;
    console.log(`\\nInitial Tyres In Hand: ${initialStock} kg`);

    // 2. Create Planned Batch
    console.log('\\n📝 Creating Planned Batch of 5000 kg...');
    let res = await request('POST', '/api/batches', {
        batch_number: `TEST-API-${Date.now()}`,
        input_tyres: 5000,
        status: 'Planned'
    });
    let batchId = res.data.id;

    // 3. Verify stock after Planned
    let stats2 = await request('GET', '/api/dashboard/stats');
    let stockAfterPlanned = stats2.summary.currentStock;
    console.log(`Tyres In Hand after Planned Batch: ${stockAfterPlanned} kg`);
    
    if (stockAfterPlanned === initialStock) {
        console.log('✅ PASS: Planned batch did NOT decrease inventory.');
    } else {
        console.log('❌ FAIL: Inventory decreased prematurely.');
    }

    // 4. Update to In-Progress
    console.log('\\n⚙️ Changing Batch to In-Progress...');
    await request('PUT', `/api/batches/${batchId}`, { status: 'In-Progress' });

    // 5. Verify stock after In-Progress
    let stats3 = await request('GET', '/api/dashboard/stats');
    let stockAfterProgress = stats3.summary.currentStock;
    console.log(`Tyres In Hand after In-Progress: ${stockAfterProgress} kg`);

    if (stockAfterProgress === initialStock - 5000) {
        console.log('✅ PASS: In-Progress batch successfully decreased inventory.');
    } else {
        console.log('❌ FAIL: Inventory did not decrease as expected.');
    }

    // Cleanup
    console.log('\\n🧹 Cleaning up test batch...');
    await request('DELETE', `/api/batches/${batchId}`);
}
run();
