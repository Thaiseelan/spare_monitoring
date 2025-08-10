const mysql = require('mysql2');

// Test database connection
const testConnection = () => {
  console.log('🔍 Testing database connection...');
  
  const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root', // Update this if your MySQL password is different
    database: 'smart_maintenance',
  });

  db.connect((err) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
      console.log('\n🔧 Troubleshooting tips:');
      console.log('1. Make sure MySQL is running');
      console.log('2. Check if the password is correct (currently set to "root")');
      console.log('3. Make sure the database "smart_maintenance" exists');
      console.log('4. Try running: mysql -u root -p');
      return;
    }

    console.log('✅ Database connection successful!');
    
    // Test basic queries
    db.query('SHOW TABLES', (err, results) => {
      if (err) {
        console.error('❌ Error showing tables:', err.message);
      } else {
        console.log('📋 Available tables:');
        results.forEach(row => {
          console.log(`  - ${Object.values(row)[0]}`);
        });
      }
      
      db.query('SELECT COUNT(*) as count FROM machines', (err, results) => {
        if (err) {
          console.error('❌ Error counting machines:', err.message);
        } else {
          console.log(`📊 Machines in database: ${results[0].count}`);
        }
        
        db.end();
        console.log('✅ Database test completed');
      });
    });
  });
};

testConnection();
