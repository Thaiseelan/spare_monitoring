const fetch = require('node-fetch');

async function testAPI() {
  console.log('🧪 Testing API endpoints...');
  
  try {
    // Test machines endpoint
    const response = await fetch('http://localhost:5000/api/machines');
    const machines = await response.json();
    
    console.log('✅ Machines API working!');
    console.log(`📊 Found ${machines.length} machines:`);
    machines.forEach(machine => {
      console.log(`  - ${machine.name} (ID: ${machine.id}) with ${machine.components.length} components`);
    });
    
    // Test components endpoint
    const compResponse = await fetch('http://localhost:5000/api/components');
    const components = await compResponse.json();
    
    console.log(`📊 Found ${components.length} components total`);
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('🔧 Make sure the backend server is running on port 5000');
  }
}

testAPI();
