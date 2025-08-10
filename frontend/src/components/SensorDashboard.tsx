// SensorDashboard.tsx
import { useEffect, useState } from "react";

interface SensorData {
  temperature: number;
  vibration: number;
  noise: number;
}

export default function SensorDashboard() {
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: 0,
    vibration: 0,
    noise: 0,
  });

  useEffect(() => {
    const fetchData = () => {
      fetch("http://localhost:5000/api/latest-reading")
        .then((res) => res.json())
        .then((data: SensorData) => {
          setSensorData(data);
        })
        .catch((err) => console.error("Fetch error:", err));
    };

    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h3>Sensor Data</h3>
      <p>Temperature: {sensorData.temperature}°C</p>
      <p>Vibration: {sensorData.vibration} mm/s</p>
      <p>Noise: {sensorData.noise} dB</p>
    </div>
  );
}
