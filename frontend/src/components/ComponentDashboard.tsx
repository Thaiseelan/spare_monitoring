import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, User, Thermometer, Volume2, Zap } from 'lucide-react';

const ComponentDashboard: React.FC = () => {
  const { machineId, component } = useParams<{ machineId: string; component: string }>();
  const navigate = useNavigate();

  const getComponentData = () => {
    switch (component) {
      case 'ball-screw-axis':
        return {
          name: 'Ball Screw X-Axis',
          status: 'WARNING',
          statusColor: 'bg-orange-600',
          bgColor: 'bg-gradient-to-br from-purple-600 to-purple-800',
          efficiency: 84,
          hoursUsed: { current: 4200, total: 5000 },
          cycles: null,
          temperature: 70,
          noise: 80,
          vibration: 4.2,
        };
      case 'lm-guideway-y-axis':
        return {
          name: 'LM Guideway Y-Axis',
          status: 'GOOD',
          statusColor: 'bg-green-600',
          bgColor: 'bg-gradient-to-br from-pink-600 to-pink-800',
          efficiency: 85,
          hoursUsed: null,
          cycles: { current: 850000, total: 1000000 },
          temperature: 60,
          noise: 65,
          vibration: 2.5,
        };
      case 'tool-magazine':
        return {
          name: 'Tool Magazine',
          status: 'CRITICAL',
          statusColor: 'bg-red-600',
          bgColor: 'bg-gradient-to-br from-cyan-600 to-cyan-800',
          efficiency: 90,
          hoursUsed: null,
          cycles: { current: 45000, total: 50000 },
          temperature: 90,
          noise: 95,
          vibration: 6.0,
        };
      default:
        return null;
    }
  };

  const data = getComponentData();

  if (!data) {
    return <div>Component not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top Navigation */}
      <nav className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* <Menu className="w-6 h-6" /> */}
          <h1 className="text-xl font-bold text-blue-400">SmartMonitor</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Bell className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              3
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <span>John Doe</span>
          </div>
        </div>
      </nav>

      <div className="p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>

        {/* Component Dashboard */}
        <div className="max-w-4xl mx-auto">
          <div className={`${data.bgColor} rounded-xl p-8 text-white shadow-2xl`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">⚙️</span>
                <h2 className="text-2xl font-bold">{data.name}</h2>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${data.statusColor}`}>
                {data.status}
              </span>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">Efficiency</span>
                <span className="text-2xl font-bold">{data.efficiency}%</span>
              </div>
              <div className="w-full bg-black bg-opacity-20 rounded-full h-3">
                <div
                  className="bg-green-400 h-3 rounded-full"
                  style={{ width: `${data.efficiency}%` }}
                ></div>
              </div>
            </div>

            {data.hoursUsed && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">Hours Used</span>
                  <span className="text-xl font-bold">
                    {data.hoursUsed.current.toLocaleString()} / {data.hoursUsed.total.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-black bg-opacity-20 rounded-full h-3">
                  <div
                    className="bg-blue-400 h-3 rounded-full"
                    style={{ width: `${(data.hoursUsed.current / data.hoursUsed.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {data.cycles && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">Cycles</span>
                  <span className="text-xl font-bold">
                    {data.cycles.current.toLocaleString()} / {data.cycles.total.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-black bg-opacity-20 rounded-full h-3">
                  <div
                    className="bg-blue-400 h-3 rounded-full"
                    style={{ width: `${(data.cycles.current / data.cycles.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <Thermometer className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-sm text-gray-300">Temperature</p>
                  <p className="text-xl font-bold">{data.temperature}°C</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Volume2 className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-sm text-gray-300">Noise</p>
                  <p className="text-xl font-bold">{data.noise} dB</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Zap className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-sm text-gray-300">Vibration</p>
                  <p className="text-xl font-bold">{data.vibration} mm/s</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Machine {machineId}</h3>
            <p className="text-gray-400">Component monitoring dashboard</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentDashboard;
