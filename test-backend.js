console.log('🧪 Testing Backend API...');

// Test using basic HTTP request
const http = require('http');

function testEndpoint(path, method = 'GET') {
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

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function runTests() {
  try {
    console.log('1. Testing /api/machines...');
    const machines = await testEndpoint('/api/machines');
    console.log(`   Status: ${machines.status}`);
    if (machines.status === 200) {
      console.log(`   Found ${machines.data.length} machines`);
      machines.data.forEach(machine => {
        console.log(`     - ${machine.name} (${machine.components.length} components)`);
      });
    } else {
      console.log(`   Error: ${JSON.stringify(machines.data)}`);
    }

    console.log('\n2. Testing /api/components...');
    const components = await testEndpoint('/api/components');
    console.log(`   Status: ${components.status}`);
    if (components.status === 200) {
      console.log(`   Found ${components.data.length} components`);
    } else {
      console.log(`   Error: ${JSON.stringify(components.data)}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('🔧 Make sure the backend server is running on port 5000');
    console.log('   Run: cd backend && npm start');
  }
}

runTests();
