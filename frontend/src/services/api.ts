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
  }
};

export { apiService };
export type { IComponent as Component, IMachine as Machine };

// Add this export for shared typing
export interface MachineWithComponents extends IMachine {
  components: IComponent[];
}
