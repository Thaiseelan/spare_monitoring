const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'smart_maintenance',
});

console.log('🚀 Adding comprehensive sample data...');

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }

  console.log('✅ Connected to database');

  // Add more comprehensive sample data
  const addSampleData = async () => {
    try {
      // Add sample machines if they don't exist
      const sampleMachines = [
        { name: 'CNC Machine Alpha' },
        { name: 'Assembly Line Beta' },
        { name: 'Packaging Unit Gamma' }
      ];

      const machineIds = [];

      for (const machine of sampleMachines) {
        const [result] = await db.promise().execute(
          'INSERT INTO machines (name) VALUES (?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
          [machine.name]
        );
        
        // Get the machine ID
        const [rows] = await db.promise().execute(
          'SELECT id FROM machines WHERE name = ?',
          [machine.name]
        );
        machineIds.push(rows[0].id);
        console.log(`✅ Added/Updated machine: ${machine.name} (ID: ${rows[0].id})`);
      }

      // Add sample components
      const sampleComponents = [
        { name: 'Ball Screw X-Axis', status: 'warning', machine_id: machineIds[0] },
        { name: 'LM Guideway Y-Axis', status: 'good', machine_id: machineIds[0] },
        { name: 'Tool Magazine', status: 'critical', machine_id: machineIds[0] },
        { name: 'Conveyor Belt Motor', status: 'good', machine_id: machineIds[1] },
        { name: 'Robotic Arm Joint', status: 'warning', machine_id: machineIds[1] },
        { name: 'Sealing Unit Pump', status: 'good', machine_id: machineIds[2] }
      ];

      const componentIds = [];

      for (const component of sampleComponents) {
        const [result] = await db.promise().execute(
          'INSERT INTO components (name, status, machine_id) VALUES (?, ?, ?)',
          [component.name, component.status, component.machine_id]
        );
        componentIds.push(result.insertId);
        console.log(`✅ Added component: ${component.name} (ID: ${result.insertId})`);
      }

      // Add sensor limits for each component
      for (const componentId of componentIds) {
        await db.promise().execute(
          'INSERT INTO sensor_limits (component_id, temperature_max, vibration_max, noise_max) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE temperature_max = VALUES(temperature_max)',
          [componentId, 80, 5, 85]
        );
      }
      console.log('✅ Added sensor limits for all components');

      // Add sample sensor data
      const sensorDataSamples = [
        { component_id: componentIds[0], temperature: 75.2, vibration: 8.5, noise: 82.3 },
        { component_id: componentIds[0], temperature: 76.8, vibration: 9.1, noise: 84.1 },
        { component_id: componentIds[1], temperature: 65.5, vibration: 3.2, noise: 68.9 },
        { component_id: componentIds[1], temperature: 64.3, vibration: 2.8, noise: 67.2 },
        { component_id: componentIds[2], temperature: 95.7, vibration: 12.4, noise: 98.5 },
        { component_id: componentIds[2], temperature: 97.2, vibration: 13.1, noise: 99.8 },
        { component_id: componentIds[3], temperature: 68.1, vibration: 2.1, noise: 71.2 },
        { component_id: componentIds[4], temperature: 72.3, vibration: 6.8, noise: 79.4 },
        { component_id: componentIds[5], temperature: 69.9, vibration: 3.5, noise: 73.8 }
      ];

      for (const sensorData of sensorDataSamples) {
        await db.promise().execute(
          'INSERT INTO sensor_data (component_id, temperature, vibration, noise) VALUES (?, ?, ?, ?)',
          [sensorData.component_id, sensorData.temperature, sensorData.vibration, sensorData.noise]
        );
      }
      console.log(`✅ Added ${sensorDataSamples.length} sensor data records`);

      // Add sample alerts
      const sampleAlerts = [
        { component_id: componentIds[0], alert_type: 'High Vibration', message: 'Vibration levels exceed normal threshold', level: 'warning', sensor_value: 8.5, threshold_value: 5.0 },
        { component_id: componentIds[2], alert_type: 'Critical Temperature', message: 'Temperature critically high - immediate attention required', level: 'critical', sensor_value: 95.7, threshold_value: 80.0 },
        { component_id: componentIds[2], alert_type: 'High Noise', message: 'Noise levels above acceptable range', level: 'warning', sensor_value: 98.5, threshold_value: 85.0 }
      ];

      for (const alert of sampleAlerts) {
        await db.promise().execute(
          'INSERT INTO alerts (component_id, alert_type, message, level, sensor_value, threshold_value) VALUES (?, ?, ?, ?, ?, ?)',
          [alert.component_id, alert.alert_type, alert.message, alert.level, alert.sensor_value, alert.threshold_value]
        );
      }
      console.log(`✅ Added ${sampleAlerts.length} sample alerts`);

      // Add sample maintenance records
      const sampleMaintenance = [
        { component_id: componentIds[0], maintenance_type: 'Routine Inspection', description: 'Regular maintenance check and lubrication', performed_by: 'Tech Team A', next_maintenance_date: '2024-09-15' },
        { component_id: componentIds[1], maintenance_type: 'Calibration', description: 'Precision calibration and alignment check', performed_by: 'Tech Team B', next_maintenance_date: '2024-10-01' },
        { component_id: componentIds[2], maintenance_type: 'Emergency Repair', description: 'Critical component replacement due to overheating', performed_by: 'Emergency Team', next_maintenance_date: '2024-08-20' }
      ];

      for (const maintenance of sampleMaintenance) {
        await db.promise().execute(
          'INSERT INTO maintenance_records (component_id, maintenance_type, description, performed_by, next_maintenance_date) VALUES (?, ?, ?, ?, ?)',
          [maintenance.component_id, maintenance.maintenance_type, maintenance.description, maintenance.performed_by, maintenance.next_maintenance_date]
        );
      }
      console.log(`✅ Added ${sampleMaintenance.length} maintenance records`);

      console.log('\n🎉 Sample data added successfully!');
      console.log('\nYou can now:');
      console.log('1. Start backend: npm start');
      console.log('2. Start frontend: cd ../frontend && npm run dev');
      console.log('3. Visit http://localhost:5173 to see your data');

    } catch (error) {
      console.error('❌ Error adding sample data:', error.message);
    } finally {
      db.end();
    }
  };

  addSampleData();
});
