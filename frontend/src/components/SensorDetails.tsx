import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import sensorDataManager from '../data/sensorData.js';
import { Activity, Thermometer, Zap, Volume2, ArrowLeft } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

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
            <div className="flex items-center space-x-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back
                </button>
                <h1 className="text-3xl font-bold text-blue-400">
                    {component?.name} - Sensor Overview
                </h1>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ml-auto ${component?.status === 'critical' ? 'bg-red-900/30 text-red-400' :
                    component?.status === 'warning' ? 'bg-orange-900/30 text-orange-400' :
                        'bg-green-900/30 text-green-400'
                    }`}>
                    {component?.status?.toUpperCase()}
                </div>
            </div>

            <div className="space-y-6 max-w-2xl mx-auto">
                {/* Temperature Card */}
                <div className="bg-orange-50 rounded-xl p-6 border border-orange-100 mb-8">
                    <div className="flex items-center mb-2">
                        <Thermometer className="w-6 h-6 text-orange-400 mr-2" />
                        <span className="font-semibold text-orange-700">Temperature</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                        <div>
                            <div className="text-xs text-gray-500">Current Reading</div>
                            <div className="text-2xl font-bold text-orange-500">{Number(sensorData?.temperature).toFixed(0)}°C</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Maximum Range</div>
                            <div className="text-xl font-bold text-orange-700">{Number(sensorLimits.temperature_max).toFixed(0)}°C</div>
                        </div>
                    </div>
                    <div className="w-full bg-orange-100 rounded-full h-2 mt-2 mb-4">
                        <div
                            className="h-2 rounded-full bg-orange-400"
                            style={{ width: `${Math.min(Number(sensorData?.temperature) / Number(sensorLimits.temperature_max) * 100, 100)}%` }}
                        ></div>
                    </div>
                    {/* Temperature Graph */}
                    <div className="bg-white rounded-lg p-4">
                        <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={temperatureData.slice(-10)}>
                                    <defs>
                                        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(value: number) => value.toFixed(0)} />
                                    <Tooltip formatter={(value: number) => value.toFixed(0)} />
                                    <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} fill="url(#tempGradient)" fillOpacity={0.8} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                {/* Vibration Card */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 mb-8">
                    <div className="flex items-center mb-2">
                        <Zap className="w-6 h-6 text-blue-400 mr-2" />
                        <span className="font-semibold text-blue-700">Vibration</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                        <div>
                            <div className="text-xs text-gray-500">Current Reading</div>
                            <div className="text-2xl font-bold text-blue-500">{Number(sensorData?.vibration).toFixed(0)}mm/s</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Maximum Range</div>
                            <div className="text-xl font-bold text-blue-700">{Number(sensorLimits.vibration_max).toFixed(0)}mm/s</div>
                        </div>
                    </div>
                    <div className="w-full bg-blue-100 rounded-full h-2 mt-2 mb-4">
                        <div
                            className="h-2 rounded-full bg-blue-400"
                            style={{ width: `${Math.min(Number(sensorData?.vibration) / Number(sensorLimits.vibration_max) * 100, 100)}%` }}
                        ></div>
                    </div>
                    {/* Vibration Graph */}
                    <div className="bg-white rounded-lg p-4">
                        <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={vibrationData.slice(-10)}>
                                    <defs>
                                        <linearGradient id="vibGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(value: number) => value.toFixed(0)} />
                                    <Tooltip formatter={(value: number) => value.toFixed(0)} />
                                    <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#vibGradient)" fillOpacity={0.8} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                {/* Noise Card */}
                <div className="bg-purple-50 rounded-xl p-6 border border-purple-100 mb-8">
                    <div className="flex items-center mb-2">
                        <Volume2 className="w-6 h-6 text-purple-400 mr-2" />
                        <span className="font-semibold text-purple-700">Noise Level</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                        <div>
                            <div className="text-xs text-gray-500">Current Reading</div>
                            <div className="text-2xl font-bold text-purple-500">{Number(sensorData?.noise).toFixed(0)}dB</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Maximum Range</div>
                            <div className="text-xl font-bold text-purple-700">{Number(sensorLimits.noise_max).toFixed(0)}dB</div>
                        </div>
                    </div>
                    <div className="w-full bg-purple-100 rounded-full h-2 mt-2 mb-4">
                        <div
                            className="h-2 rounded-full bg-purple-400"
                            style={{ width: `${Math.min(Number(sensorData?.noise) / Number(sensorLimits.noise_max) * 100, 100)}%` }}
                        ></div>
                    </div>
                    {/* Noise Graph */}
                    <div className="bg-white rounded-lg p-4">
                        <div className="h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={noiseData.slice(-10)}>
                                    <defs>
                                        <linearGradient id="noiseGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(value: number) => value.toFixed(0)} />
                                    <Tooltip formatter={(value: number) => value.toFixed(0)} />
                                    <Area type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} fill="url(#noiseGradient)" fillOpacity={0.8} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SensorDetails; 