# API Service Enhancements & Real-time Features

## Overview
This document outlines the enhanced API service methods and real-time data updates implemented for the spare monitoring system.

## New API Methods

### 1. Sensor Data Management
```typescript
// Get sensor data for a component with optional time range
getSensorData: (componentId: number, timeRange?: string) => Promise<SensorData[]>

// Get latest sensor data for a component
getLatestSensorData: (componentId: number) => Promise<SensorData>
```

### 2. Alert Management
```typescript
// Get alerts for a specific component or all alerts
getAlerts: (componentId?: number) => Promise<Alert[]>
```

### 3. Maintenance Records
```typescript
// Get maintenance records for a component
getMaintenanceRecords: (componentId: number) => Promise<MaintenanceRecord[]>
```

### 4. Sensor Limits Management
```typescript
// Get sensor limits for a component
getSensorLimits: (componentId: number) => Promise<SensorLimits>

// Update sensor limits for a component
updateSensorLimits: (componentId: number, limits: SensorLimits) => Promise<void>
```

### 5. ML Predictions
```typescript
// Get ML predictions for a component
getMLPredictions: (componentId: number) => Promise<MLPrediction>
```

## Data Interfaces

### SensorData
```typescript
interface SensorData {
  id: number;
  component_id: number;
  vibration: number;
  temperature: number;
  noise: number;
  timestamp: string;
}
```

### Alert
```typescript
interface Alert {
  id: number;
  component_id: number;
  message: string;
  level: string;
  timestamp: string;
}
```

### MaintenanceRecord
```typescript
interface MaintenanceRecord {
  id: number;
  component_id: number;
  description: string;
  performed_by: string;
  performed_at: string;
  next_maintenance?: string;
}
```

### SensorLimits
```typescript
interface SensorLimits {
  temperature_max: number;
  vibration_max: number;
  noise_max: number;
}
```

### MLPrediction
```typescript
interface MLPrediction {
  next_maintenance_date: string;
  failure_probability: number;
  recommended_actions: string[];
  confidence: number;
}
```

## Real-time Data Updates

### WebSocket Implementation
The system now supports real-time data updates via WebSocket connections:

```typescript
// WebSocket connection for real-time updates
const ws = new WebSocket('ws://localhost:5000/sensor-data');

ws.onopen = () => {
  // Subscribe to component updates
  ws.send(JSON.stringify({ 
    type: 'subscribe', 
    componentId: componentId 
  }));
};

ws.onmessage = (event) => {
  const newData = JSON.parse(event.data);
  // Handle real-time sensor data updates
};
```

### Fallback Polling
If WebSocket is not available, the system falls back to polling:

```typescript
// Polling fallback every 5 seconds
const interval = setInterval(() => {
  fetchComponentData(componentId);
}, 5000);
```

## Backend Endpoints

### New Sensor Routes
- `PUT /api/sensors/limits/:component_id` - Update sensor limits
- `GET /api/sensors/data?component_id=X` - Get sensor data with filtering
- `GET /api/sensors/alerts?component_id=X` - Get alerts with filtering

### Maintenance Routes
- `GET /api/maintenance?component_id=X` - Get maintenance records
- `POST /api/maintenance/log` - Log maintenance activity

### ML Routes
- `GET /api/ml/predictions/:component_id` - Get ML predictions (mock implementation)

## Component Updates

### ComponentDetail.tsx
- Removed mock data generation
- Implemented real API calls with error handling
- Added WebSocket support for real-time updates
- Enhanced loading states and error handling

### SensorDetails.tsx
- Replaced dummy data with real API integration
- Added real-time chart updates via WebSocket
- Implemented proper error handling and loading states
- Enhanced sensor data visualization

### New MLPredictions.tsx
- Created new component for ML predictions display
- Shows failure risk assessment
- Displays recommended actions
- Provides maintenance predictions

## WebSocket Server

### Backend Implementation
The backend now includes a WebSocket server that:
- Manages client subscriptions by component
- Broadcasts sensor data updates in real-time
- Handles connection lifecycle events
- Provides fallback mechanisms

### Message Format
```json
{
  "type": "sensor_update",
  "component_id": 1,
  "vibration": 3.2,
  "temperature": 65.5,
  "noise": 72.1,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Installation & Setup

### Backend Dependencies
```bash
cd backend
npm install ws
```

### Frontend Usage
The enhanced API service is automatically available in all components. Import the required interfaces:

```typescript
import { 
  apiService, 
  SensorData, 
  Alert, 
  MaintenanceRecord, 
  SensorLimits 
} from '../services/api';
```

## Error Handling

All new API methods include comprehensive error handling:
- Network errors are caught and displayed to users
- Loading states are properly managed
- Fallback data is provided when endpoints are unavailable
- WebSocket connection failures gracefully fall back to polling

## Performance Considerations

- WebSocket connections are automatically cleaned up on component unmount
- Sensor data is limited to last 50 data points to prevent memory issues
- Polling intervals are configurable (default: 5 seconds)
- Chart data is limited to last 10 points for smooth rendering

## Future Enhancements

1. **Real ML Integration**: Replace mock ML predictions with actual ML model integration
2. **Advanced Filtering**: Add time range and sensor type filtering
3. **Data Export**: Add CSV/JSON export functionality
4. **Alert Management**: Add alert acknowledgment and resolution features
5. **Dashboard Analytics**: Add aggregated analytics and reporting
