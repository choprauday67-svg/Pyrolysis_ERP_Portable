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
  console.log("=== Testing Supplier Validation ===");

  // Generate unique name for testing
  const uniqueName = `Test Supplier ${Date.now()}`;
  const token = null;

  // 2. Test Invalid Phone
  console.log("\n2. Test: Invalid Phone");
  const res1 = await makeRequest('POST', '/api/suppliers', {
    name: uniqueName,
    contact: '123abcd',
    location: 'Test Loc'
  }, token);
  console.log(`Status: ${res1.status}`);
  console.log(`Response: ${JSON.stringify(res1.data)}`);
  if (res1.status === 400 && res1.data.message.includes('10-digit')) {
    console.log("✅ PASS: Blocked invalid phone");
  } else {
    console.log("❌ FAIL: Did not block invalid phone correctly");
  }

  // 3. Test Valid Supplier
  console.log("\n3. Test: Valid Supplier");
  const res2 = await makeRequest('POST', '/api/suppliers', {
    name: uniqueName,
    contact: '9988776655',
    location: 'Test Loc'
  }, token);
  console.log(`Status: ${res2.status}`);
  console.log(`Response: ${JSON.stringify(res2.data)}`);
  if (res2.status === 201) {
    console.log("✅ PASS: Allowed valid supplier");
  } else {
    console.log("❌ FAIL: Did not allow valid supplier");
  }

  // 4. Test Duplicate Supplier
  console.log("\n4. Test: Duplicate Supplier (case-insensitive)");
  const res3 = await makeRequest('POST', '/api/suppliers', {
    name: `  ${uniqueName.toLowerCase()}  `, // Test trim and lower
    contact: '9988776655',
    location: 'Test Loc'
  }, token);
  console.log(`Status: ${res3.status}`);
  console.log(`Response: ${JSON.stringify(res3.data)}`);
  if (res3.status === 409 && res3.data.message.includes('exists')) {
    console.log("✅ PASS: Blocked duplicate supplier");
  } else {
    console.log("❌ FAIL: Did not block duplicate correctly");
  }

  // Clean up
  if (res2.data && res2.data.data && res2.data.data.id) {
    await makeRequest('DELETE', `/api/suppliers/${res2.data.data.id}`, null, token);
    console.log(`\nCleaned up test supplier ${res2.data.data.id}`);
  }
}

runTests().catch(console.error);
