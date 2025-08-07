require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root', // Update if needed
  database: 'smart_maintenance',
});

// Database initialization function
const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    // First, create database if it doesn't exist
    const createDbQuery = 'CREATE DATABASE IF NOT EXISTS smart_maintenance';

    // Create a connection without specifying database
    const tempDb = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
    });

    tempDb.query(createDbQuery, (err) => {
      if (err) {
        console.error('Error creating database:', err);
        reject(err);
        return;
      }

      console.log('✅ Database created/verified');
      tempDb.end();

      // Now connect to the database and create tables
      db.connect((err) => {
        if (err) {
          console.error('Database connection failed:', err);
          reject(err);
          return;
        }
        console.log('✅ Connected to MySQL database');

        // Create tables if they don't exist
        const createTablesQueries = [
          // Create machines table first (others depend on it)
          `CREATE TABLE IF NOT EXISTS machines (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )`,

          // Create components table
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

          // Create sensor_data table
          `CREATE TABLE IF NOT EXISTS sensor_data (
            id INT AUTO_INCREMENT PRIMARY KEY,
            component_id INT NOT NULL,
            temperature FLOAT,
            vibration FLOAT,
            noise FLOAT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
          )`,

          // Create sensor_limits table
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

          // Create alerts table
          `CREATE TABLE IF NOT EXISTS alerts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            component_id INT NOT NULL,
            alert_type VARCHAR(50),
            message TEXT,
            level VARCHAR(20),
            sensor_value FLOAT,
            threshold_value FLOAT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
          )`,

          // Create notification_recipients table
          `CREATE TABLE IF NOT EXISTS notification_recipients (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255),
            chat_id VARCHAR(50),
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )`
        ];

        // Execute all table creation queries
        let completed = 0;
        const totalQueries = createTablesQueries.length;

        createTablesQueries.forEach((query, index) => {
          db.query(query, (err) => {
            if (err) {
              console.error(`Error creating table ${index + 1}:`, err);
              reject(err);
              return;
            }

            completed++;
            console.log(`✅ Table ${index + 1} created/verified`);

            if (completed === totalQueries) {
              console.log('✅ All database tables initialized successfully');
              resolve();
            }
          });
        });
      });
    });
  });
};

// Initialize database on startup
initializeDatabase()
  .then(() => {
    console.log('🚀 Database initialization completed');
  })
  .catch((err) => {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  });

// ✅ GET all machines with components
app.get('/api/machines', (req, res) => {
  const query = `
    SELECT 
      m.id AS machine_id,
      m.name AS machine_name,
      c.id AS component_id,
      c.name AS component_name,
      c.status,
      c.last_maintenance,
      c.next_maintenance
    FROM machines m
    LEFT JOIN components c ON m.id = c.machine_id
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching machines with components:', err);
      return res.status(500).json({ error: 'Failed to fetch machines' });
    }

    const machinesMap = new Map();

    results.forEach(row => {
      if (!machinesMap.has(row.machine_id)) {
        machinesMap.set(row.machine_id, {
          id: row.machine_id,
          name: row.machine_name,
          components: [],
        });
      }

      if (row.component_id) {
        machinesMap.get(row.machine_id).components.push({
          id: row.component_id,
          name: row.component_name,
          status: row.status,
          last_maintenance: row.last_maintenance,
          next_maintenance: row.next_maintenance,
        });
      }
    });

    res.json(Array.from(machinesMap.values()));
  });
});

// ✅ POST a new machine
app.post('/api/machines', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Machine name is required' });
  }

  const query = 'INSERT INTO machines (name) VALUES (?)';
  db.query(query, [name], (err, result) => {
    if (err) {
      console.error('Error inserting machine:', err);
      return res.status(500).json({ error: 'Failed to add machine' });
    }
    res.status(201).json({ id: result.insertId, name });
  });
});

// ✅ DELETE a machine and its components
app.delete('/api/machines/:id', (req, res) => {
  const machineId = req.params.id;

  db.query('DELETE FROM components WHERE machine_id = ?', [machineId], (err) => {
    if (err) {
      console.error('Error deleting components:', err);
      return res.status(500).json({ error: 'Failed to delete components' });
    }

    db.query('DELETE FROM machines WHERE id = ?', [machineId], (err, result) => {
      if (err) {
        console.error('Error deleting machine:', err);
        return res.status(500).json({ error: 'Failed to delete machine' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Machine not found' });
      }

      res.status(204).send();
    });
  });
});

// ✅ GET sensor limits for a machine
app.get('/api/machines/:id/sensor-limits', (req, res) => {
  const machineId = req.params.id;

  const query = `
    SELECT c.id as component_id, c.name as component_name, 
           COALESCE(sl.temperature_max, 80) as temperature_max,
           COALESCE(sl.vibration_max, 5) as vibration_max,
           COALESCE(sl.noise_max, 85) as noise_max
    FROM components c
    LEFT JOIN sensor_limits sl ON c.id = sl.component_id
    WHERE c.machine_id = ?
  `;

  db.query(query, [machineId], (err, results) => {
    if (err) {
      console.error('Error fetching sensor limits:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json(results);
  });
});

// ✅ GET all sensor limits
app.get('/api/sensors/limits', (req, res) => {
  const query = `
    SELECT c.id as component_id, c.name as component_name, c.machine_id,
           COALESCE(sl.temperature_max, 80) as temperature_max,
           COALESCE(sl.vibration_max, 5) as vibration_max,
           COALESCE(sl.noise_max, 85) as noise_max
    FROM components c
    LEFT JOIN sensor_limits sl ON c.id = sl.component_id
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching all sensor limits:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json(results);
  });
});

// ✅ Component routes
const componentRoutes = require('./routes/componentRoutes');
app.use('/api/components', componentRoutes);

// ✅ Sensor routes
const sensorRoutes = require('./routes/sensorRoutes');
app.use('/api/sensors', sensorRoutes);

// Fallback route
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
