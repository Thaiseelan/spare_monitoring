import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, AlertTriangle, Wrench, TrendingUp, Clock } from 'lucide-react';
import { apiService, Component } from '../services/api';

// Define local interfaces for the data we need
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

const ComponentDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [component, setComponent] = useState<Component | null>(null);
    const [sensorData, setSensorData] = useState<SensorData[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetchComponentData(parseInt(id));
        }
    }, [id]);

    const fetchComponentData = async (componentId: number) => {
        try {
            setLoading(true);
            const componentData = await apiService.getComponent(componentId);
            
            setComponent(componentData);
            
            // For now, we'll use mock data since the API doesn't have these endpoints
            // In a real implementation, these would be actual API calls
            setSensorData([
                {
                    id: 1,
                    component_id: componentId,
                    vibration: 2.5,
                    temperature: 45.2,
                    noise: 68.3,
                    timestamp: new Date().toISOString()
                }
            ]);
            
            setAlerts([
                {
                    id: 1,
                    component_id: componentId,
                    message: "Temperature approaching threshold",
                    level: "warning",
                    timestamp: new Date().toISOString()
                }
            ]);
            
            setMaintenanceRecords([
                {
                    id: 1,
                    component_id: componentId,
                    description: "Routine inspection completed",
                    performed_by: "John Doe",
                    performed_at: new Date().toISOString(),
                    next_maintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            ]);
            
            setError(null);
        } catch (err) {
            console.error('Error fetching component data:', err);
            setError('Failed to load component data.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'good':
                return 'text-green-400';
            case 'warning':
                return 'text-orange-400';
            case 'critical':
                return 'text-red-400';
            default:
                return 'text-gray-400';
        }
    };

    const getAlertLevelColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'critical':
                return 'bg-red-900/20 border-red-500/50 text-red-300';
            case 'warning':
                return 'bg-orange-900/20 border-orange-500/50 text-orange-300';
            default:
                return 'bg-yellow-900/20 border-yellow-500/50 text-yellow-300';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-400">Loading component data...</span>
            </div>
        );
    }

    if (error || !component) {
        return (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-400 mr-3" />
                    <h3 className="text-lg font-semibold text-red-400">Error</h3>
                </div>
                <p className="text-red-300 mb-4">{error || 'Component not found'}</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                >
                    Back to Components
                </button>
            </div>
        );
    }

    const latestSensorData = sensorData[0];
    const recentAlerts = alerts.slice(0, 5);
    const recentMaintenance = maintenanceRecords.slice(0, 3);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{component.name}</h1>
                        <div className="flex items-center space-x-2 mt-1">
                            <Activity className={`w-4 h-4 ${getStatusColor(component.status)}`} />
                            <span className={`text-sm ${getStatusColor(component.status)}`}>
                                {component.status || 'Unknown'} Status
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side - Component Information */}
                <div className="space-y-6">
                    {/* Component Overview */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 text-blue-400">Component Information</h2>
                        <div className="space-y-4">
                            <div>
                                <div className="text-sm text-gray-400">Component Name</div>
                                <div className="text-lg font-semibold">{component.name}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400">Status</div>
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    component.status === 'critical' ? 'bg-red-900/30 text-red-400' :
                                    component.status === 'warning' ? 'bg-orange-900/30 text-orange-400' :
                                    'bg-green-900/30 text-green-400'
                                }`}>
                                    {component.status?.toUpperCase() || 'UNKNOWN'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Maintenance Information */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 text-blue-400 flex items-center">
                            <Wrench className="w-5 h-5 mr-2" />
                            Maintenance
                        </h2>
                        <div className="space-y-4">
                            {component.last_maintenance && (
                                <div>
                                    <div className="text-sm text-gray-400">Last Maintenance</div>
                                    <div className="text-lg font-semibold">
                                        {new Date(component.last_maintenance).toLocaleDateString()}
                                    </div>
                                </div>
                            )}
                            {component.next_maintenance && (
                                <div>
                                    <div className="text-sm text-gray-400">Next Maintenance</div>
                                    <div className="text-lg font-semibold">
                                        {new Date(component.next_maintenance).toLocaleDateString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side - Sensor Data and Alerts */}
                <div className="space-y-6">
                    {/* Current Sensor Data */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center text-blue-400">
                            <TrendingUp className="w-5 h-5 mr-2" />
                            Current Sensor Data
                        </h2>
                        {latestSensorData ? (
                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-gray-700 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-gray-400 mb-1">Vibration</div>
                                            <div className="text-2xl font-bold">
                                                {latestSensorData.vibration.toFixed(1)}
                                                <span className="text-sm text-gray-400 ml-1">m/s²</span>
                                            </div>
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded ${latestSensorData.vibration > 8 ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                                            {latestSensorData.vibration > 8 ? '⚠️ High' : '✅ Normal'}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-700 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-gray-400 mb-1">Temperature</div>
                                            <div className="text-2xl font-bold">
                                                {latestSensorData.temperature.toFixed(1)}
                                                <span className="text-sm text-gray-400 ml-1">°C</span>
                                            </div>
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded ${latestSensorData.temperature > 80 ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                                            {latestSensorData.temperature > 80 ? '🔥 Hot' : '✅ Normal'}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-700 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm text-gray-400 mb-1">Noise Level</div>
                                            <div className="text-2xl font-bold">
                                                {latestSensorData.noise.toFixed(1)}
                                                <span className="text-sm text-gray-400 ml-1">dB</span>
                                            </div>
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded ${latestSensorData.noise > 85 ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                                            {latestSensorData.noise > 85 ? '🔊 Loud' : '✅ Normal'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-400 text-center py-8">
                                No sensor data available
                            </div>
                        )}
                    </div>

                    {/* Recent Alerts */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center text-blue-400">
                            <AlertTriangle className="w-5 h-5 mr-2" />
                            Recent Alerts
                        </h2>
                        {recentAlerts.length > 0 ? (
                            <div className="space-y-3">
                                {recentAlerts.map((alert) => (
                                    <div
                                        key={alert.id}
                                        className={`p-4 rounded-lg border ${getAlertLevelColor(alert.level)}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium">{alert.message}</div>
                                                <div className="text-sm opacity-75">
                                                    {new Date(alert.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="text-xs px-2 py-1 rounded bg-gray-700">
                                                {alert.level}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-400 text-center py-8">
                                No recent alerts
                            </div>
                        )}
                    </div>

                    {/* Recent Maintenance Records */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center text-blue-400">
                            <Clock className="w-5 h-5 mr-2" />
                            Recent Maintenance Records
                        </h2>
                        {recentMaintenance.length > 0 ? (
                            <div className="space-y-3">
                                {recentMaintenance.map((record) => (
                                    <div key={record.id} className="bg-gray-700 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-medium">{record.description}</div>
                                            <div className="text-sm text-gray-400">
                                                {new Date(record.performed_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            Performed by: {record.performed_by}
                                        </div>
                                        {record.next_maintenance && (
                                            <div className="text-sm text-gray-400 mt-1">
                                                Next maintenance: {new Date(record.next_maintenance).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-400 text-center py-8">
                                No maintenance records available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComponentDetail;
