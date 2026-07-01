const http = require('http');
const jwt = require('jsonwebtoken');

function request(method, path) {
    return new Promise((resolve, reject) => {
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
        req.end();
    });
}

async function run() {
    require('dotenv').config();
    let stats1 = await request('GET', '/api/dashboard/stats');
    console.log('stats1:', stats1.summary ? stats1.summary.currentStock : stats1);
}
run();
