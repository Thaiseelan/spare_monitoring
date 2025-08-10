require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 5000;

// Middleware - MUST be at the top, before all routes
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.json());

// WebSocket connection management
const clients = new Map(); // Map to store client connections by component

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'subscribe' && data.componentId) {
        // Subscribe client to component updates
        if (!clients.has(data.componentId)) {
          clients.set(data.componentId, new Set());
        }
        clients.get(data.componentId).add(ws);
        
        console.log(`Client subscribed to component ${data.componentId}`);
        
        // Send confirmation
        ws.send(JSON.stringify({
          type: 'subscription_confirmed',
          componentId: data.componentId
        }));
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    // Remove client from all component subscriptions
    clients.forEach((clientSet, componentId) => {
      if (clientSet.has(ws)) {
        clientSet.delete(ws);
        if (clientSet.size === 0) {
          clients.delete(componentId);
        }
      }
    });
    console.log('WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Function to broadcast sensor data to subscribed clients
const broadcastSensorData = (componentId, sensorData) => {
  if (clients.has(componentId)) {
    const message = JSON.stringify({
      type: 'sensor_update',
      component_id: componentId,
      ...sensorData
    });
    
    clients.get(componentId).forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
};

// Make broadcastSensorData globally available for routes
global.broadcastSensorData = broadcastSensorData;

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

// Add sample data function
const addSampleData = async () => {
  return new Promise((resolve, reject) => {
    // Check if data already exists
    db.query('SELECT COUNT(*) as count FROM machines', (err, results) => {
      if (err) {
        console.error('Error checking existing data:', err);
        reject(err);
        return;
      }

      if (results[0].count > 0) {
        console.log('✅ Sample data already exists, skipping...');
        resolve();
        return;
      }

      console.log('📝 Adding sample data...');

      // Insert sample machines
      const machines = [
        { name: 'CNC Machine 1' },
        { name: 'Assembly Line A' },
        { name: 'Packaging Unit B' }
      ];

      let machinesInserted = 0;
      const machineIds = [];

      machines.forEach((machine, index) => {
        db.query('INSERT INTO machines (name) VALUES (?)', [machine.name], (err, result) => {
          if (err) {
            console.error('Error inserting machine:', err);
            reject(err);
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

            components.forEach((component, compIndex) => {
              db.query(
                'INSERT INTO components (name, status, machine_id) VALUES (?, ?, ?)',
                [component.name, component.status, component.machine_id],
                (err, result) => {
                  if (err) {
                    console.error('Error inserting component:', err);
                    reject(err);
                    return;
                  }
                  componentIds.push(result.insertId);
                  componentsInserted++;

                  if (componentsInserted === components.length) {
                    // Insert sample sensor data
                    const sensorData = [
                      { component_id: componentIds[0], temperature: 75.2, vibration: 8.5, noise: 82.3 },
                      { component_id: componentIds[0], temperature: 76.8, vibration: 9.1, noise: 84.1 },
                      { component_id: componentIds[1], temperature: 65.5, vibration: 3.2, noise: 68.9 },
                      { component_id: componentIds[1], temperature: 64.3, vibration: 2.8, noise: 67.2 },
                      { component_id: componentIds[2], temperature: 95.7, vibration: 12.4, noise: 98.5 },
                      { component_id: componentIds[2], temperature: 97.2, vibration: 13.1, noise: 99.8 }
                    ];

                    let sensorDataInserted = 0;
                    sensorData.forEach((data, sensorIndex) => {
                      db.query(
                        'INSERT INTO sensor_data (component_id, temperature, vibration, noise) VALUES (?, ?, ?, ?)',
                        [data.component_id, data.temperature, data.vibration, data.noise],
                        (err) => {
                          if (err) {
                            console.error('Error inserting sensor data:', err);
                            reject(err);
                            return;
                          }
                          sensorDataInserted++;

                          if (sensorDataInserted === sensorData.length) {
                            // Insert sample sensor limits
                            const sensorLimits = [
                              { component_id: componentIds[0], temperature_max: 80, vibration_max: 5, noise_max: 85 },
                              { component_id: componentIds[1], temperature_max: 80, vibration_max: 5, noise_max: 85 },
                              { component_id: componentIds[2], temperature_max: 80, vibration_max: 5, noise_max: 85 }
                            ];

                            let limitsInserted = 0;
                            sensorLimits.forEach((limits, limitIndex) => {
                              db.query(
                                'INSERT INTO sensor_limits (component_id, temperature_max, vibration_max, noise_max) VALUES (?, ?, ?, ?)',
                                [limits.component_id, limits.temperature_max, limits.vibration_max, limits.noise_max],
                                (err) => {
                                  if (err) {
                                    console.error('Error inserting sensor limits:', err);
                                    reject(err);
                                    return;
                                  }
                                  limitsInserted++;

                                  if (limitsInserted === sensorLimits.length) {
                                    console.log('✅ Sample data added successfully');
                                    resolve();
                                  }
                                }
                              );
                            });
                          }
                        }
                      );
                    });
                  }
                }
              );
            });
          }
        });
      });
    });
  });
};

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
server.listen(PORT, async () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready at ws://localhost:${PORT}`);
  
  // Initialize database and add sample data
  try {
    await initializeDatabase();
    await addSampleData();
    console.log('✅ Database initialized with sample data');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
});
