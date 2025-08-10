const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'smart_maintenance',
});

console.log('🔍 Checking database contents...');

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }

  console.log('✅ Connected to database');

  // Check machines
  db.query('SELECT * FROM machines', (err, machines) => {
    if (err) {
      console.error('❌ Error fetching machines:', err.message);
      return;
    }

    console.log('\n📊 MACHINES:');
    if (machines.length === 0) {
      console.log('   No machines found');
    } else {
      machines.forEach(machine => {
        console.log(`   - ID: ${machine.id}, Name: ${machine.name}`);
      });
    }

    // Check components
    db.query('SELECT * FROM components', (err, components) => {
      if (err) {
        console.error('❌ Error fetching components:', err.message);
        return;
      }

      console.log('\n🔧 COMPONENTS:');
      if (components.length === 0) {
        console.log('   No components found');
      } else {
        components.forEach(comp => {
          console.log(`   - ID: ${comp.id}, Name: ${comp.name}, Machine ID: ${comp.machine_id}, Status: ${comp.status}`);
        });
      }

      // Check sensor data
      db.query('SELECT COUNT(*) as count FROM sensor_data', (err, sensorCount) => {
        if (err) {
          console.error('❌ Error counting sensor data:', err.message);
          return;
        }

        console.log(`\n📡 SENSOR DATA: ${sensorCount[0].count} records`);

        // Check sensor limits
        db.query('SELECT * FROM sensor_limits', (err, limits) => {
          if (err) {
            console.error('❌ Error fetching sensor limits:', err.message);
            return;
          }

          console.log(`\n⚙️  SENSOR LIMITS: ${limits.length} records`);
          limits.forEach(limit => {
            console.log(`   - Component ${limit.component_id}: Temp=${limit.temperature_max}, Vib=${limit.vibration_max}, Noise=${limit.noise_max}`);
          });

          db.end();
          console.log('\n✅ Database check completed');
        });
      });
    });
  });
});
