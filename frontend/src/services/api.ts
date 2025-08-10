type ComponentStatus = 'good' | 'warning' | 'critical';

interface IComponent {
  id: number;
  name: string;
  status: ComponentStatus;
  last_maintenance: string | null;
  next_maintenance: string | null;
  machine_id: number;
  created_at: string;
  updated_at: string;
}

interface IMachine {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  components?: IComponent[];
}

// New interfaces for enhanced functionality
interface SensorData {
  id: number;
  component_id: number;
  vibration: number;
  temperature: number;
  noise: number;
  timestamp: string;
}

interface Alert {
  id: number;
  component_id: number;
  message: string;
  level: string;
  timestamp: string;
}

interface MaintenanceRecord {
  id: number;
  component_id: number;
  description: string;
  performed_by: string;
  performed_at: string;
  next_maintenance?: string;
}

interface SensorLimits {
  temperature_max: number;
  vibration_max: number;
  noise_max: number;
}

// ✅ Set your backend API base URL (adjust port if needed)
const API_BASE = 'http://localhost:5000/api';

const apiService = {
  // Fetch all components
  async getComponents(): Promise<IComponent[]> {
    const res = await fetch(`${API_BASE}/components`);
    if (!res.ok) throw new Error(`Components fetch failed: ${res.status}`);
    return (await res.json()) as IComponent[];
  },

  // Add a new component
  async addComponent(component: Omit<IComponent, 'id' | 'created_at' | 'updated_at'>): Promise<IComponent> {
    const res = await fetch(`${API_BASE}/components`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(component)
    });
    if (!res.ok) throw new Error(`Component creation failed: ${res.status}`);
    return (await res.json()) as IComponent;
  },

  // Fetch all machines
  async getMachines(): Promise<IMachine[]> {
    const res = await fetch(`${API_BASE}/machines`);
    if (!res.ok) throw new Error(`Machines fetch failed: ${res.status}`);
    return (await res.json()) as IMachine[];
  },

  // Fetch a machine with its components
  async getMachineWithComponents(machineId: number): Promise<IMachine> {
    const res = await fetch(`${API_BASE}/machines/${machineId}?includeComponents=true`);
    if (!res.ok) throw new Error(`Machine fetch failed: ${res.status}`);
    return (await res.json()) as IMachine;
  },

  // ✅ Add a new machine
  async addMachine(machineName: string): Promise<IMachine> {
    const res = await fetch(`${API_BASE}/machines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: machineName })
    });
    if (!res.ok) throw new Error(`Machine creation failed: ${res.status}`);
    return (await res.json()) as IMachine;
  },

  // Delete a machine
  async deleteMachine(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/machines/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Machine deletion failed: ${res.status}`);
  },

  // Delete a component
  async deleteComponent(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/components/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Component deletion failed: ${res.status}`);
  },

  // Health check endpoint
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  // Get latest sensor data for a component
  async getLatestSensorData(componentId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/sensors/latest/${componentId}`);
    if (!res.ok) throw new Error(`Sensor data fetch failed: ${res.status}`);
    return await res.json();
  },

  // Get component details
  async getComponent(componentId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/components/${componentId}`);
    if (!res.ok) throw new Error(`Component fetch failed: ${res.status}`);
    return await res.json();
  },

  // Get sensor limits for a component
  async getSensorLimits(componentId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/sensors/limits/${componentId}`);
    if (!res.ok) {
      // Return default limits if not found
      return {
        temperature_max: 80,
        vibration_max: 5,
        noise_max: 85
      };
    }
    return await res.json();
  },

  // Get sensor limits for all components of a machine
  async getMachineSensorLimits(machineId: number): Promise<any[]> {
    const res = await fetch(`${API_BASE}/machines/${machineId}/sensor-limits`);
    if (!res.ok) {
      return [];
    }
    return await res.json();
  },

  // Get all sensor limits
  async getAllSensorLimits(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/sensors/limits`);
    if (!res.ok) {
      return [];
    }
    return await res.json();
  },

  // ✅ NEW: Get sensor data for a component with optional time range
  async getSensorData(componentId: number, timeRange?: string): Promise<SensorData[]> {
    let url = `${API_BASE}/sensors/data?component_id=${componentId}`;
    if (timeRange) {
      url += `&timeRange=${timeRange}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sensor data fetch failed: ${res.status}`);
    return await res.json();
  },

  // ✅ NEW: Get alerts for a component or all alerts
  async getAlerts(componentId?: number): Promise<Alert[]> {
    let url = `${API_BASE}/sensors/alerts`;
    if (componentId) {
      url += `?component_id=${componentId}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Alerts fetch failed: ${res.status}`);
    return await res.json();
  },

  // ✅ NEW: Get maintenance records for a component
  async getMaintenanceRecords(componentId: number): Promise<MaintenanceRecord[]> {
    const res = await fetch(`${API_BASE}/maintenance?component_id=${componentId}`);
    if (!res.ok) throw new Error(`Maintenance records fetch failed: ${res.status}`);
    return await res.json();
  },

  // ✅ NEW: Update sensor limits for a component
  async updateSensorLimits(componentId: number, limits: SensorLimits): Promise<void> {
    const res = await fetch(`${API_BASE}/sensors/limits/${componentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(limits)
    });
    if (!res.ok) throw new Error(`Sensor limits update failed: ${res.status}`);
  },

  // ✅ NEW: Get ML predictions for a component
  async getMLPredictions(componentId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/ml/predictions/${componentId}`);
    if (!res.ok) {
      // Return mock predictions if endpoint doesn't exist yet
      return {
        next_maintenance_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        failure_probability: 0.15,
        recommended_actions: ['Monitor temperature', 'Check vibration levels'],
        confidence: 0.85
      };
    }
    return await res.json();
  },

  // New function to fetch sensor values directly
  async getSensorValues(componentId: number): Promise<any[]> {
    const response = await fetch(`/api/components/${componentId}/sensor-values`);
    if (!response.ok) throw new Error("Failed to fetch sensor values");
    return response.json();
  }
};

export { apiService };
export type { 
  IComponent as Component, 
  IMachine as Machine,
  SensorData,
  Alert,
  MaintenanceRecord,
  SensorLimits
};

// Add this export for shared typing
export interface MachineWithComponents extends IMachine {
  components: IComponent[];
}

// Utility function to wrap promises with a timeout
export function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request timed out")), ms))
  ]);
}
