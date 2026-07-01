const http = require('http');

function makeRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log("=== Testing Settings Validation ===");

  // 1. Get a token (assuming admin exists)
  console.log("1. Fetching auth token...");
  const loginRes = await makeRequest('POST', '/api/users/login', { username: 'admin', password: 'password123' });
  const token = loginRes.data.token;
  if (!token) {
      console.log("Could not login. Ensure backend is running and 'admin'/'password123' works. Skipping tests.");
      process.exit(1);
  }

  // 2. Test Invalid Negative Price
  console.log("\n2. Test: Negative Price");
  const res1 = await makeRequest('POST', '/api/settings/prices', {
    oil: -10, carbon: 35, steel: 25, energy: 5
  }, token);
  console.log(`Status: ${res1.status}`);
  console.log(`Response: ${JSON.stringify(res1.data)}`);
  if (res1.status === 400 && res1.data.message.includes('greater than zero')) {
    console.log("✅ PASS: Blocked negative price");
  } else {
    console.log("❌ FAIL: Did not block negative price correctly");
  }

  // 3. Test Invalid Zero Limit
  console.log("\n3. Test: Zero Limit");
  const res2 = await makeRequest('POST', '/api/settings/limits', {
    tyre: 5000, oil: 0, carbon: 1000
  }, token);
  console.log(`Status: ${res2.status}`);
  console.log(`Response: ${JSON.stringify(res2.data)}`);
  if (res2.status === 400 && res2.data.message.includes('greater than zero')) {
    console.log("✅ PASS: Blocked zero limit");
  } else {
    console.log("❌ FAIL: Did not block zero limit correctly");
  }

  // 4. Test Valid Settings Update
  console.log("\n4. Test: Valid Settings Update");
  const res3 = await makeRequest('POST', '/api/settings/limits', {
    tyre: 5000, oil: 2000, carbon: 1000
  }, token);
  console.log(`Status: ${res3.status}`);
  console.log(`Response: ${JSON.stringify(res3.data)}`);
  if (res3.status === 200) {
    console.log("✅ PASS: Allowed valid limits");
  } else {
    console.log("❌ FAIL: Did not allow valid limits");
  }

}

runTests().catch(console.error);
