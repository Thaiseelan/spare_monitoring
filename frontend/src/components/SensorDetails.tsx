// SensorDetails.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService, SensorData, SensorLimits, Component, withTimeout } from '../services/api';
import { Activity, Thermometer, Zap, Volume2, ArrowLeft } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

/**
 * SensorDetails
 * - Shows component info and three charts (temperature, vibration, noise)
 * - Real-time via WebSocket and fallback polling
 * - Uses Promise.allSettled so one failing endpoint won't kill the whole page
 * - Chart X axis uses an index-based label to avoid overlapping when timestamps identical
 */

// simple tooltip for Recharts
const CustomTooltip = (props: any) => {
  const { active, payload, label, color } = props;
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#23272f',
        borderRadius: 8,
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

  // main state
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [sensorLimits, setSensorLimits] = useState<SensorLimits | null>(null);
  const [component, setComponent] = useState<Component | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // chart-friendly states (array of { idx, timeLabel, value })
  const [temperatureData, setTemperatureData] = useState<{ idx: number, time: string, value: number }[]>([]);
  const [vibrationData, setVibrationData] = useState<{ idx: number, time: string, value: number }[]>([]);
  const [noiseData, setNoiseData] = useState<{ idx: number, time: string, value: number }[]>([]);

  // refs
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<number | null>(null);
  const wsConnectedRef = useRef(false);

  // helper: convert a SensorData row into chart points
  const mapRowsToCharts = (rows: SensorData[]) => {
    // assume rows are returned newest-to-oldest — let's put oldest first for chart
    const ordered = [...rows].reverse();
    const temp = ordered.map((r, i) => ({
      idx: i,
      time: (r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : `#${i+1}`),
      value: Number(r.temperature)
    }));
    const vib = ordered.map((r, i) => ({
      idx: i,
      time: (r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : `#${i+1}`),
      value: Number(r.vibration)
    }));
    const noise = ordered.map((r, i) => ({
      idx: i,
      time: (r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : `#${i+1}`),
      value: Number(r.noise)
    }));
    return { temp, vib, noise };
  };

  // update chart states from a *single* new reading (append)
  const appendReadingToCharts = (reading: SensorData) => {
    setSensorData(prev => {
      const updated = [...prev, reading].slice(-200); // keep last 200 in main state as safety
      return updated;
    });

    // Use idx from current existing last index + 1 to avoid duplicate x labels
    setTemperatureData(prev => {
      const nextIdx = prev.length ? prev[prev.length - 1].idx + 1 : 0;
      const next = [...prev, { idx: nextIdx, time: new Date(reading.timestamp).toLocaleTimeString(), value: Number(reading.temperature) }];
      return next.slice(-50);
    });

    setVibrationData(prev => {
      const nextIdx = prev.length ? prev[prev.length - 1].idx + 1 : 0;
      const next = [...prev, { idx: nextIdx, time: new Date(reading.timestamp).toLocaleTimeString(), value: Number(reading.vibration) }];
      return next.slice(-50);
    });

    setNoiseData(prev => {
      const nextIdx = prev.length ? prev[prev.length - 1].idx + 1 : 0;
      const next = [...prev, { idx: nextIdx, time: new Date(reading.timestamp).toLocaleTimeString(), value: Number(reading.noise) }];
      return next.slice(-50);
    });
  };

  // SINGLE fetchData used by initial load and polling
  const fetchData = async () => {
    if (!componentId) return;
    try {
      // timeout wrapper provided by your api service file (withTimeout)
      const [dataResult, limitsResult, compResult] = await Promise.allSettled([
        withTimeout(apiService.getSensorData(parseInt(componentId)), 2000),
        withTimeout(apiService.getSensorLimits(parseInt(componentId)), 2000),
        withTimeout(apiService.getComponent(parseInt(componentId)), 2000)
      ]);

      // handle sensorData
      if (dataResult.status === 'fulfilled' && Array.isArray(dataResult.value)) {
        const rows = dataResult.value as SensorData[];
        setSensorData(rows);
        const { temp, vib, noise } = mapRowsToCharts(rows);
        setTemperatureData(temp);
        setVibrationData(vib);
        setNoiseData(noise);
      } else {
        console.warn('Sensor data failed:', (dataResult as any).reason);
        // If no sensor data at all, show an error state
        if (dataResult.status === 'rejected') {
          setError('Failed to fetch sensor readings');
        }
      }

      // limits
      if (limitsResult.status === 'fulfilled') {
        setSensorLimits(limitsResult.value);
      } else {
        console.warn('Sensor limits failed:', (limitsResult as any).reason);
      }

      // component details
      if (compResult.status === 'fulfilled') {
        setComponent(compResult.value);
      } else {
        console.warn('Component details failed:', (compResult as any).reason);
      }

    } catch (err) {
      console.error('Unexpected fetchData error:', err);
      setError('Some data could not be loaded');
    } finally {
      setLoading(false);
    }
  };

  // start polling; it will respect wsConnectedRef (pause if WS connected)
  const startPolling = () => {
    // clear existing
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    // start new polling loop
    pollingRef.current = window.setInterval(async () => {
      if (wsConnectedRef.current) return; // pause polling when ws connected
      await fetchData();
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // initial fetch + start polling
  useEffect(() => {
    if (!componentId) return;
    setLoading(true);
    setError('');
    fetchData();
    startPolling();
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentId]);

  // WebSocket setup: connect, subscribe, append messages. Pause polling while connected.
  useEffect(() => {
    if (!componentId) return;

    try {
      const ws = new WebSocket('ws://localhost:5000/sensor-data');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected for real-time sensor updates');
        wsConnectedRef.current = true;
        // pause polling while WS connected
        stopPolling();
        // subscribe to the specific component
        ws.send(JSON.stringify({ type: 'subscribe', componentId: parseInt(componentId) }));
      };

      ws.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          // expected payload shape: { component_id, vibration, temperature, noise, timestamp, id? }
          if (payload && Number(payload.component_id) === Number(componentId)) {
            // ensure data has expected fields; convert to SensorData shape
            const reading: SensorData = {
              id: payload.id ?? Date.now(),
              component_id: Number(payload.component_id),
              vibration: payload.vibration ?? payload.vib ?? payload.vibration,
              temperature: payload.temperature ?? payload.temp ?? payload.temperature,
              noise: payload.noise ?? payload.noiseLevel ?? payload.noise,
              timestamp: payload.timestamp ?? new Date().toISOString()
            } as any;

            // append to state & charts
            appendReadingToCharts(reading);
          }
        } catch (err) {
          console.error('WS message parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };

      ws.onclose = () => {
        console.log('WebSocket closed. Falling back to polling.');
        wsConnectedRef.current = false;
        // resume polling after slight backoff
        setTimeout(() => {
          startPolling();
        }, 1000);
      };

    } catch (err) {
      console.warn('WebSocket unavailable; using polling only.', err);
      wsConnectedRef.current = false;
      startPolling();
    }

    // cleanup
    return () => {
      try {
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
          wsConnectedRef.current = false;
        }
      } finally {
        startPolling(); // ensure polling resumes when component unmounts WS
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
  }, [componentId]);

  // derived latest reading
  const latestSensorData = sensorData.length ? sensorData[sensorData.length - 1] : null;

  // Render
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-400">Loading sensor data...</span>
      </div>
    );
  }

  if (error && !sensorData.length) {
    // if there is an error and no sensor data at all, show the error card
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

  // fallback defaults if limits missing
  const tempMax = sensorLimits ? Number(sensorLimits.temperature_max) : 80;
  const vibMax = sensorLimits ? Number(sensorLimits.vibration_max) : 5;
  const noiseMax = sensorLimits ? Number(sensorLimits.noise_max) : 85;

  // small helpers for progress bars
  const getPercent = (value: number | undefined, max: number) => {
    if (value === undefined || value === null || isNaN(value)) return 0;
    return Math.min(100, Math.round((value / max) * 100));
  };

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
                {component?.name ?? `Component ${componentId}`}
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
          {(component?.status ?? 'GOOD').toString().toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left side - Info + Sensor Data */}
        <div className="space-y-6">
          {/* Component Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Component Information</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-400">Component Name</div>
                <div className="text-lg font-semibold">{component?.name ?? `Component ${componentId}`}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Status</div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${component?.status === 'critical' ? 'bg-red-900/30 text-red-400' : component?.status === 'warning' ? 'bg-orange-900/30 text-orange-400' : 'bg-green-900/30 text-green-400'}`}>{(component?.status ?? 'GOOD').toString().toUpperCase()}</div>
              </div>
            </div>
          </div>

          {/* Sensor Data cards */}
          <div className="bg-gray-800 rounded-lg p-6 flex-1">
            <h2 className="text-xl font-semibold mb-6 text-blue-400">Sensor Data</h2>

            {/* Temperature Card */}
            <div className="bg-gray-900 rounded-lg p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Thermometer className="w-8 h-8 text-orange-400" />
                  <div>
                    <div className="text-lg font-bold text-orange-300">{latestSensorData ? Number(latestSensorData.temperature).toFixed(0) : '0'}°C</div>
                    <div className="text-sm text-gray-400">Current Temperature</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Max Threshold</div>
                  <div className="text-lg font-bold text-orange-400">{tempMax}°C</div>
                </div>
              </div>

              <div className="w-full bg-gray-700 rounded-full h-4">
                <div className="h-4 rounded-full bg-orange-400 transition-all duration-500" style={{ width: `${getPercent(latestSensorData ? Number(latestSensorData.temperature) : 0, tempMax)}%` }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>0°C</span>
                <span>{tempMax}°C</span>
              </div>
            </div>

            {/* Vibration Card */}
            <div className="bg-gray-900 rounded-lg p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Zap className="w-8 h-8 text-blue-400" />
                  <div>
                    <div className="text-lg font-bold text-blue-300">{latestSensorData ? Number(latestSensorData.vibration).toFixed(0) : '0'}mm/s</div>
                    <div className="text-sm text-gray-400">Current Vibration</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Max Threshold</div>
                  <div className="text-lg font-bold text-blue-400">{vibMax}mm/s</div>
                </div>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div className="h-4 rounded-full bg-blue-400 transition-all duration-500" style={{ width: `${getPercent(latestSensorData ? Number(latestSensorData.vibration) : 0, vibMax)}%` }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>0mm/s</span>
                <span>{vibMax}mm/s</span>
              </div>
            </div>

            {/* Noise Card */}
            <div className="bg-gray-900 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Volume2 className="w-8 h-8 text-purple-400" />
                  <div>
                    <div className="text-lg font-bold text-purple-300">{latestSensorData ? Number(latestSensorData.noise).toFixed(0) : '0'}dB</div>
                    <div className="text-sm text-gray-400">Current Noise Level</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Max Threshold</div>
                  <div className="text-lg font-bold text-purple-400">{noiseMax}dB</div>
                </div>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div className="h-4 rounded-full bg-purple-400 transition-all duration-500" style={{ width: `${getPercent(latestSensorData ? Number(latestSensorData.noise) : 0, noiseMax)}%` }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>0dB</span>
                <span>{noiseMax}dB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Charts */}
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
                    <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
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
                    <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
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
                    <YAxis stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
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
      {/* removed GraphComponent and any dangling code */}
    </div>
  );
};

export default SensorDetails;
