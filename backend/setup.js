const mysql = require('mysql2');

console.log('🚀 Setting up Spare Monitoring System...');

// Create database connection without specifying database first
const tempDb = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root', // Update this if your MySQL password is different
});

// Step 1: Create database
tempDb.query('CREATE DATABASE IF NOT EXISTS smart_maintenance', (err) => {
  if (err) {
    console.error('❌ Error creating database:', err.message);
    console.log('\n🔧 Please check:');
    console.log('1. MySQL is running');
    console.log('2. Your MySQL password is correct');
    console.log('3. You have permission to create databases');
    tempDb.end();
    return;
  }

  console.log('✅ Database created/verified');
  tempDb.end();

  // Step 2: Connect to the database and create tables
  const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'smart_maintenance',
  });

  db.connect((err) => {
    if (err) {
      console.error('❌ Error connecting to database:', err.message);
      return;
    }

    console.log('✅ Connected to database');

    // Create tables
    const createTablesQueries = [
      `CREATE TABLE IF NOT EXISTS machines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS components (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status ENUM('good', 'warning', 'critical') DEFAULT 'good',
        last_maintenance DATE,
        next_maintenance DATE,
        machine_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS sensor_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        component_id INT NOT NULL,
        temperature FLOAT,
        vibration FLOAT,
        noise FLOAT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS sensor_limits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        component_id INT NOT NULL,
        temperature_max DECIMAL(5,2) DEFAULT 80.00,
        vibration_max DECIMAL(5,2) DEFAULT 5.00,
        noise_max DECIMAL(5,2) DEFAULT 85.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        component_id INT NOT NULL,
        alert_type VARCHAR(50),
        message TEXT,
        level VARCHAR(20),
        sensor_value FLOAT,
        threshold_value FLOAT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS maintenance_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        component_id INT NOT NULL,
        maintenance_type VARCHAR(100),
        description TEXT,
        performed_by VARCHAR(100),
        performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        next_maintenance_date DATE,
        FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
      )`
    ];

    let completed = 0;
    const totalQueries = createTablesQueries.length;

    createTablesQueries.forEach((query, index) => {
      db.query(query, (err) => {
        if (err) {
          console.error(`❌ Error creating table ${index + 1}:`, err.message);
          return;
        }

        completed++;
        console.log(`✅ Table ${index + 1} created/verified`);

        if (completed === totalQueries) {
          console.log('✅ All tables created successfully');
          addSampleData(db);
        }
      });
    });
  });
});

// Add sample data
const addSampleData = (db) => {
  console.log('📝 Adding sample data...');

  // Check if data already exists
  db.query('SELECT COUNT(*) as count FROM machines', (err, results) => {
    if (err) {
      console.error('❌ Error checking existing data:', err.message);
      db.end();
      return;
    }

    if (results[0].count > 0) {
      console.log('✅ Sample data already exists');
      db.end();
      return;
    }

    // Insert sample machines
    const machines = [
      { name: 'CNC Machine 1' },
      { name: 'Assembly Line A' },
      { name: 'Packaging Unit B' }
    ];

    let machinesInserted = 0;
    const machineIds = [];

    machines.forEach((machine) => {
      db.query('INSERT INTO machines (name) VALUES (?)', [machine.name], (err, result) => {
        if (err) {
          console.error('❌ Error inserting machine:', err.message);
          return;
        }
        machineIds.push(result.insertId);
        machinesInserted++;

        if (machinesInserted === machines.length) {
          // Insert sample components
          const components = [
            { name: 'Ball Screw X-Axis', status: 'warning', machine_id: machineIds[0] },
            { name: 'LM Guideway Y-Axis', status: 'good', machine_id: machineIds[0] },
            { name: 'Tool Magazine', status: 'critical', machine_id: machineIds[0] },
            { name: 'Conveyor Belt', status: 'good', machine_id: machineIds[1] },
            { name: 'Robotic Arm', status: 'warning', machine_id: machineIds[1] },
            { name: 'Sealing Unit', status: 'good', machine_id: machineIds[2] }
          ];

          let componentsInserted = 0;
          const componentIds = [];

          components.forEach((component) => {
            db.query(
              'INSERT INTO components (name, status, machine_id) VALUES (?, ?, ?)',
              [component.name, component.status, component.machine_id],
              (err, result) => {
                if (err) {
                  console.error('❌ Error inserting component:', err.message);
                  return;
                }
                componentIds.push(result.insertId);
                componentsInserted++;

                if (componentsInserted === components.length) {
                  console.log('✅ Sample data added successfully');
                  console.log('\n🎉 Setup completed! You can now:');
                  console.log('1. Start the backend: npm start');
                  console.log('2. Start the frontend: cd ../frontend && npm run dev');
                  db.end();
                }
              }
            );
          });
        }
      });
    });
  });
};
