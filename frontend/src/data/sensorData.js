// Real-time sensor data storage
class SensorDataManager {
    constructor() {
        this.sensorData = new Map();
        this.updateCallbacks = [];
    }

    // Generate random sensor data for a component
    generateSensorData(componentId) {
        if (!this._spikeState) this._spikeState = {};
        if (!this._spikeState[componentId]) {
            this._spikeState[componentId] = {
                phase: 0,
                breachSensor: null,
                breachCount: 0,
                lastBreachTime: Date.now(),
            };
        }
        const state = this._spikeState[componentId];
        const now = Date.now();

        // After every 3 seconds, pick a new sensor to breach
        if (!state.breachSensor || now - state.lastBreachTime > 3000 + state.breachCount * 1000) {
            const sensors = ['temperature', 'vibration', 'noise'];
            state.breachSensor = sensors[Math.floor(Math.random() * sensors.length)];
            state.breachCount = 0;
            state.lastBreachTime = now;
        }

        // Normal random values
        let vibration = 1.0 + Math.random() * 2; // 1-3
        let temperature = 35.0 + Math.random() * 5; // 35-40
        let noise = 60.0 + Math.random() * 5; // 60-65

        // If in breach phase, force one sensor to breach threshold for 3 consecutive readings
        if (state.breachCount < 3) {
            if (state.breachSensor === 'temperature') temperature = 85 + Math.random() * 5; // above 80
            if (state.breachSensor === 'vibration') vibration = 9 + Math.random() * 2; // above 8
            if (state.breachSensor === 'noise') noise = 90 + Math.random() * 5; // above 85
            state.breachCount++;
        }

        // After 3 breaches, reset breachSensor after 3 seconds
        if (state.breachCount >= 3 && now - state.lastBreachTime > 3000) {
            state.breachSensor = null;
            state.breachCount = 0;
            state.lastBreachTime = now;
        }

        const data = {
            id: Date.now(),
            component_id: componentId,
            vibration: parseFloat(vibration),
            temperature: parseFloat(temperature),
            noise: parseFloat(noise),
            timestamp: new Date().toISOString()
        };

        this.sensorData.set(componentId, data);
        this.notifyUpdateCallbacks(componentId, data);
        return data;
    }

    // Get current sensor data for a component
    getSensorData(componentId) {
        if (!this.sensorData.has(componentId)) {
            return this.generateSensorData(componentId);
        }
        return this.sensorData.get(componentId);
    }

    // Update sensor data for a component
    updateSensorData(componentId, data) {
        this.sensorData.set(componentId, {
            ...data,
            timestamp: new Date().toISOString()
        });
        this.notifyUpdateCallbacks(componentId, data);
    }

    // Subscribe to sensor data updates
    subscribeToUpdates(componentId, callback) {
        this.updateCallbacks.push({ componentId, callback });
    }

    // Unsubscribe from updates
    unsubscribeFromUpdates(componentId, callback) {
        this.updateCallbacks = this.updateCallbacks.filter(
            cb => !(cb.componentId === componentId && cb.callback === callback)
        );
    }

    // Notify all subscribers of updates
    notifyUpdateCallbacks(componentId, data) {
        this.updateCallbacks.forEach(({ componentId: cbComponentId, callback }) => {
            if (cbComponentId === componentId) {
                callback(data);
            }
        });
    }

    // Start real-time updates for a component
    startRealTimeUpdates(componentId, intervalMs = 5000) {
        const updateData = () => {
            this.generateSensorData(componentId);
        };

        const intervalId = setInterval(updateData, intervalMs);

        // Return function to stop updates
        return () => {
            clearInterval(intervalId);
        };
    }

    // Get all sensor data
    getAllSensorData() {
        return Array.from(this.sensorData.values());
    }

    // Clear all data
    clearAllData() {
        this.sensorData.clear();
        this.updateCallbacks = [];
    }
}

// Create singleton instance
const sensorDataManager = new SensorDataManager();

export default sensorDataManager; 