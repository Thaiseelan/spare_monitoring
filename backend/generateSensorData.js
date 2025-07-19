const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'smart_maintenance',
});

async function generateSensorData() {
    try {
        // Get all components
        const [components] = await db.execute('SELECT id FROM components');

        for (const component of components) {
            // Generate random sensor data
            const vibration = (Math.random() * 4 + 1).toFixed(1); // 1-5 mm/s
            const temperature = (Math.random() * 30 + 35).toFixed(1); // 35-65°C
            const noise = (Math.random() * 20 + 60).toFixed(1); // 60-80 dB

            // Insert sensor data
            await db.execute(
                'INSERT INTO sensor_data (component_id, vibration, temperature, noise, timestamp) VALUES (?, ?, ?, ?, NOW())',
                [component.id, vibration, temperature, noise]
            );

            console.log(`Generated sensor data for component ${component.id}: ${temperature}°C, ${vibration}mm/s, ${noise}dB`);
        }
    } catch (error) {
        console.error('Error generating sensor data:', error);
    }
}

// Generate data every 30 seconds
setInterval(generateSensorData, 30000);

console.log('Sensor data generator started. Press Ctrl+C to stop.');
generateSensorData(); // Generate initial data 