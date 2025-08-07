import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import sensorDataManager from '../data/sensorData.js';
import { Activity, Thermometer, Zap, Volume2, ArrowLeft } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface SensorData {
    id: number;
    component_id: number;
    vibration: number;
    temperature: number;
    noise: number;
    timestamp: string;
}

interface SensorLimits {
    temperature_max: number;
    vibration_max: number;
    noise_max: number;
}

interface Component {
    id: number;
    name: string;
    status: string;
    machine_id: number;
}

// Custom dark tooltip for charts
const CustomTooltip = (props: any) => {
    const { active, payload, label, color } = props;
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: '#23272f',
                borderRadius: '8px',
                padding: '8px 12px',
                color: color,
                border: `1px solid ${color}`,
                fontWeight: 600,
                fontSize: 14,
                boxShadow: '0 2px 8px #0002'
            }}>
                <div style={{ marginBottom: 4 }}>{label ?? ''}</div>
                <div>{Number(payload?.[0]?.value).toFixed(1)}</div>
            </div>
        );
    }
    return null;
};

const SensorDetails: React.FC = () => {
    const { componentId } = useParams<{ componentId: string }>();
    const navigate = useNavigate();
    const [sensorData, setSensorData] = useState<SensorData | null>(null);
    const [sensorLimits, setSensorLimits] = useState<SensorLimits>({
        temperature_max: 80,
        vibration_max: 5,
        noise_max: 85
    });
    const [component, setComponent] = useState<Component | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [temperatureData, setTemperatureData] = useState<any[]>([]);
    const [vibrationData, setVibrationData] = useState<any[]>([]);
    const [noiseData, setNoiseData] = useState<any[]>([]);

    useEffect(() => {
        if (componentId) {
            setLoading(true);
            setError('');

            // Initialize sensor data immediately (no async)
            initializeSensorData();

            // Fetch component details and limits
            Promise.all([
                fetchComponentDetails(),
                fetchSensorLimits()
            ]).then(() => {
                setLoading(false);
            }).catch((err) => {
                console.error('Error initializing sensor data:', err);
                setError('Failed to load sensor data');
                setLoading(false);
            });

            // Set up real-time updates
            const stopUpdates = sensorDataManager.startRealTimeUpdates(parseInt(componentId), 5000);

            return () => {
                stopUpdates();
            };
        }
    }, [componentId]);

    useEffect(() => {
      if (!sensorData || !componentId) return;

      // Send the first value immediately
      fetch('http://localhost:5000/api/sensors/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component_id: Number(componentId),
          temperature: sensorData.temperature,
          vibration: sensorData.vibration,
          noise: sensorData.noise,
          timestamp: new Date().toISOString()
        })
      });

      const interval = setInterval(() => {
        fetch('http://localhost:5000/api/sensors/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            component_id: Number(componentId),
            temperature: sensorData.temperature,
            vibration: sensorData.vibration,
            noise: sensorData.noise,
            timestamp: new Date().toISOString()
          })
        });
      }, 3000); // every 3 seconds

      return () => clearInterval(interval);
    }, [sensorData, componentId]);

    const updateGraphData = (data: SensorData) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        setTemperatureData(prev => [...prev, { time: timeStr, value: data.temperature }].slice(-10));
        setVibrationData(prev => [...prev, { time: timeStr, value: data.vibration }].slice(-10));
        setNoiseData(prev => [...prev, { time: timeStr, value: data.noise }].slice(-10));
    };

    const initializeSensorData = () => {
        const data = sensorDataManager.getSensorData(parseInt(componentId!));
        setSensorData(data);
        updateGraphData(data); // <-- Add this line

        // Subscribe to updates
        sensorDataManager.subscribeToUpdates(parseInt(componentId!), (newData: SensorData) => {
            setSensorData(newData);
            updateGraphData(newData); // <-- And here
        });
    };

    const fetchComponentDetails = async () => {
        try {
            const data = await apiService.getComponent(parseInt(componentId!));
            setComponent(data);
        } catch (err) {
            console.error('Error fetching component details:', err);
            // Don't throw error, just log it
        }
    };

    const fetchSensorLimits = async () => {
        try {
            const limits = await apiService.getSensorLimits(parseInt(componentId!));
            setSensorLimits(limits);
        } catch (err) {
            console.error('Error fetching sensor limits:', err);
            // Use default limits if not found
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-400">Loading sensor data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                    <Activity className="w-6 h-6 text-red-400 mr-3" />
                    <h3 className="text-lg font-semibold text-red-400">Error</h3>
                </div>
                <p className="text-red-300 mb-4">{error}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center space-x-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-gray-400 hover:text-blue-400 transition-colors duration-200 text-lg font-medium"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-baseline space-x-3">
                            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300 tracking-tight">
                                {component?.name}
                            </h1>
                            <span className="text-lg font-medium text-gray-400 px-3 py-1 bg-gray-800 rounded-full">
                                Sensor Overview
                            </span>
                        </div>
                        <div className="flex items-center mt-2 space-x-4">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <span className="text-sm text-gray-400 font-medium">Real-time Monitoring</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span className="text-sm text-gray-400 font-medium">Active</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={`px-6 py-3 rounded-xl text-lg font-bold tracking-wide shadow-lg border ${component?.status === 'critical' ? 'bg-red-900/40 text-red-300 border-red-500/30' : component?.status === 'warning' ? 'bg-orange-900/40 text-orange-300 border-orange-500/30' : 'bg-green-900/40 text-green-300 border-green-500/30'}`}>
                    {component?.status?.toUpperCase()}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side - Component Info and Threshold Values */}
                <div className="space-y-6">
                    {/* Component Information */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 text-blue-400">Component Information</h2>
                        <div className="space-y-4">
                            <div>
                                <div className="text-sm text-gray-400">Component Name</div>
                                <div className="text-lg font-semibold">{component?.name}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400">Status</div>
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${component?.status === 'critical' ? 'bg-red-900/30 text-red-400' : component?.status === 'warning' ? 'bg-orange-900/30 text-orange-400' : 'bg-green-900/30 text-green-400'}`}>{component?.status?.toUpperCase()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Sensor Data - Merged Threshold Values and Current Readings */}
                    <div className="bg-gray-800 rounded-lg p-6 flex-1">
                        <h2 className="text-xl font-semibold mb-6 text-blue-400">Sensor Data</h2>
                        <div className="space-y-6">
                            {/* Temperature */}
                            <div className="bg-gray-900 rounded-lg p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                        <Thermometer className="w-8 h-8 text-orange-400" />
                                        <div>
                                            <div className="text-lg font-bold text-orange-300">{Number(sensorData?.temperature).toFixed(0)}°C</div>
                                            <div className="text-sm text-gray-400">Current Temperature</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-400">Max Threshold</div>
                                        <div className="text-lg font-bold text-orange-400">{Number(sensorLimits.temperature_max).toFixed(0)}°C</div>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-4">
                                    <div className="h-4 rounded-full bg-orange-400 transition-all duration-500" style={{ width: `${Math.min(Number(sensorData?.temperature) / Number(sensorLimits.temperature_max) * 100, 100)}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-2">
                                    <span>0°C</span>
                                    <span>{Number(sensorLimits.temperature_max).toFixed(0)}°C</span>
                                </div>
                            </div>

                            {/* Vibration */}
                            <div className="bg-gray-900 rounded-lg p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                        <Zap className="w-8 h-8 text-blue-400" />
                                        <div>
                                            <div className="text-lg font-bold text-blue-300">{Number(sensorData?.vibration).toFixed(0)}mm/s</div>
                                            <div className="text-sm text-gray-400">Current Vibration</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-400">Max Threshold</div>
                                        <div className="text-lg font-bold text-blue-400">{Number(sensorLimits.vibration_max).toFixed(0)}mm/s</div>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-4">
                                    <div className="h-4 rounded-full bg-blue-400 transition-all duration-500" style={{ width: `${Math.min(Number(sensorData?.vibration) / Number(sensorLimits.vibration_max) * 100, 100)}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-2">
                                    <span>0mm/s</span>
                                    <span>{Number(sensorLimits.vibration_max).toFixed(0)}mm/s</span>
                                </div>
                            </div>

                            {/* Noise Level */}
                            <div className="bg-gray-900 rounded-lg p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                        <Volume2 className="w-8 h-8 text-purple-400" />
                                        <div>
                                            <div className="text-lg font-bold text-purple-300">{Number(sensorData?.noise).toFixed(0)}dB</div>
                                            <div className="text-sm text-gray-400">Current Noise Level</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-400">Max Threshold</div>
                                        <div className="text-lg font-bold text-purple-400">{Number(sensorLimits.noise_max).toFixed(0)}dB</div>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-4">
                                    <div className="h-4 rounded-full bg-purple-400 transition-all duration-500" style={{ width: `${Math.min(Number(sensorData?.noise) / Number(sensorLimits.noise_max) * 100, 100)}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-2">
                                    <span>0dB</span>
                                    <span>{Number(sensorLimits.noise_max).toFixed(0)}dB</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Charts */}
                <div className="space-y-8 flex flex-col justify-between h-full">
                    {/* Temperature Chart */}
                    <div className="bg-gray-800 rounded-lg p-4 h-56 flex flex-col">
                        <div className="flex items-center mb-3">
                            <Thermometer className="w-5 h-5 text-orange-400 mr-2" />
                            <span className="font-semibold text-orange-400">Temperature Trend</span>
                        </div>
                        <div className="flex-1">
                            {temperatureData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={temperatureData.slice(-10)}>
                                        <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(value: number) => value.toFixed(0)} />
                                        <Tooltip content={<CustomTooltip color="#f97316" />} />
                                        <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    Loading temperature data...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Vibration Chart */}
                    <div className="bg-gray-800 rounded-lg p-4 h-56 flex flex-col">
                        <div className="flex items-center mb-3">
                            <Zap className="w-5 h-5 text-blue-400 mr-2" />
                            <span className="font-semibold text-blue-400">Vibration Trend</span>
                        </div>
                        <div className="flex-1">
                            {vibrationData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={vibrationData.slice(-10)}>
                                        <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(value: number) => value.toFixed(0)} />
                                        <Tooltip content={<CustomTooltip color="#3b82f6" />} />
                                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    Loading vibration data...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Noise Chart */}
                    <div className="bg-gray-800 rounded-lg p-4 h-56 flex flex-col">
                        <div className="flex items-center mb-3">
                            <Volume2 className="w-5 h-5 text-purple-400 mr-2" />
                            <span className="font-semibold text-purple-400">Noise Level Trend</span>
                        </div>
                        <div className="flex-1">
                            {noiseData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={noiseData.slice(-10)}>
                                        <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(value: number) => value.toFixed(0)} />
                                        <Tooltip content={<CustomTooltip color="#a855f7" />} />
                                        <Line type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    Loading noise data...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SensorDetails; 