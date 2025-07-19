import React, { useState, useEffect } from 'react';
import { ArrowLeft, Thermometer, Zap, Volume2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface SensorData {
    temperature: number[];
    vibration: number[];
    noise: number[];
}

interface MachineConfig {
    name: string;
    component: string;
    status: 'good' | 'warning' | 'critical';
    sensors: {
        temperature: { current: number; max: number; unit: string };
        vibration: { current: number; max: number; unit: string };
        noise: { current: number; max: number; unit: string };
    };
}

const MachineDetails: React.FC = () => {
    const [machineConfig] = useState<MachineConfig>({
        name: 'Ball Screw X-Axis',
        component: 'Linear Motion System',
        status: 'warning',
        sensors: {
            temperature: { current: 45, max: 80, unit: '°C' },
            vibration: { current: 2.3, max: 5.0, unit: 'mm/s' },
            noise: { current: 68, max: 85, unit: 'dB' }
        }
    });

    const [sensorData, setSensorData] = useState<SensorData>({
        temperature: Array.from({ length: 50 }, (_, i) => 40 + Math.sin(i * 0.1) * 10 + Math.random() * 5),
        vibration: Array.from({ length: 50 }, (_, i) => 2 + Math.sin(i * 0.2) * 1.5 + Math.random() * 0.5),
        noise: Array.from({ length: 50 }, (_, i) => 65 + Math.sin(i * 0.15) * 8 + Math.random() * 3)
    });

    // Simulate live data updates
    useEffect(() => {
        const interval = setInterval(() => {
            setSensorData(prev => ({
                temperature: [...prev.temperature.slice(1), 40 + Math.sin(Date.now() * 0.001) * 10 + Math.random() * 5],
                vibration: [...prev.vibration.slice(1), 2 + Math.sin(Date.now() * 0.002) * 1.5 + Math.random() * 0.5],
                noise: [...prev.noise.slice(1), 65 + Math.sin(Date.now() * 0.0015) * 8 + Math.random() * 3]
            }));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'good':
                return <CheckCircle className="w-8 h-8 text-green-500" />;
            case 'warning':
                return <AlertTriangle className="w-8 h-8 text-yellow-500" />;
            case 'critical':
                return <XCircle className="w-8 h-8 text-red-500" />;
            default:
                return <CheckCircle className="w-8 h-8 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'good':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'warning':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const renderWaveGraph = (data: number[], title: string, color: string, unit: string, max: number) => {
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const range = maxValue - minValue;

        const pathData = data.map((value, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - ((value - minValue) / range) * 100;
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        return (
            <div className="bg-white rounded-lg p-4 shadow-md">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Current: {data[data.length - 1].toFixed(1)}{unit}</span>
                        <span className="text-sm text-gray-500">Max: {max}{unit}</span>
                    </div>
                </div>
                <div className="relative h-32 bg-gray-50 rounded border overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
                                <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.1 }} />
                            </linearGradient>
                        </defs>
                        <path
                            d={`${pathData} L 100 100 L 0 100 Z`}
                            fill={`url(#gradient-${title})`}
                        />
                        <path
                            d={pathData}
                            fill="none"
                            stroke={color}
                            strokeWidth="0.5"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                    <div className="absolute top-2 right-2 text-xs text-gray-500">
                        Live Data
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-6">
                        <div className="flex items-center space-x-4">
                            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{machineConfig.name}</h1>
                                <h2 className="text-xl text-gray-600 mt-1">{machineConfig.component}</h2>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className={`px-4 py-2 rounded-lg border ${getStatusColor(machineConfig.status)}`}>
                                <span className="text-sm font-medium capitalize">{machineConfig.status}</span>
                            </div>
                            {getStatusIcon(machineConfig.status)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Half - Sensor Information */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-6">Sensor Overview</h3>

                            {/* Temperature Sensor */}
                            <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                                <div className="flex items-center space-x-3 mb-3">
                                    <Thermometer className="w-6 h-6 text-orange-600" />
                                    <h4 className="text-lg font-medium text-gray-900">Temperature</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Current Reading</p>
                                        <p className="text-2xl font-bold text-orange-600">
                                            {machineConfig.sensors.temperature.current}{machineConfig.sensors.temperature.unit}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Maximum Range</p>
                                        <p className="text-2xl font-bold text-gray-700">
                                            {machineConfig.sensors.temperature.max}{machineConfig.sensors.temperature.unit}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-orange-600 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${(machineConfig.sensors.temperature.current / machineConfig.sensors.temperature.max) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* Vibration Sensor */}
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center space-x-3 mb-3">
                                    <Zap className="w-6 h-6 text-blue-600" />
                                    <h4 className="text-lg font-medium text-gray-900">Vibration</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Current Reading</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {machineConfig.sensors.vibration.current}{machineConfig.sensors.vibration.unit}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Maximum Range</p>
                                        <p className="text-2xl font-bold text-gray-700">
                                            {machineConfig.sensors.vibration.max}{machineConfig.sensors.vibration.unit}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${(machineConfig.sensors.vibration.current / machineConfig.sensors.vibration.max) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* Noise Sensor */}
                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="flex items-center space-x-3 mb-3">
                                    <Volume2 className="w-6 h-6 text-purple-600" />
                                    <h4 className="text-lg font-medium text-gray-900">Noise Level</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Current Reading</p>
                                        <p className="text-2xl font-bold text-purple-600">
                                            {machineConfig.sensors.noise.current}{machineConfig.sensors.noise.unit}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Maximum Range</p>
                                        <p className="text-2xl font-bold text-gray-700">
                                            {machineConfig.sensors.noise.max}{machineConfig.sensors.noise.unit}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${(machineConfig.sensors.noise.current / machineConfig.sensors.noise.max) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Half - Graphs */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-6">Live Sensor Data</h3>

                            {/* Temperature Graph */}
                            {renderWaveGraph(
                                sensorData.temperature,
                                'Temperature Monitoring',
                                '#ea580c',
                                '°C',
                                machineConfig.sensors.temperature.max
                            )}

                            {/* Vibration Graph */}
                            {renderWaveGraph(
                                sensorData.vibration,
                                'Vibration Analysis',
                                '#2563eb',
                                'mm/s',
                                machineConfig.sensors.vibration.max
                            )}

                            {/* Noise Graph */}
                            {renderWaveGraph(
                                sensorData.noise,
                                'Noise Level Monitoring',
                                '#7c3aed',
                                'dB',
                                machineConfig.sensors.noise.max
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MachineDetails; 