require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

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

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('✅ Connected to MySQL database');
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
