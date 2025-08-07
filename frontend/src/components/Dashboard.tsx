import React, { useEffect, useState } from 'react';
import { Bell, Filter, Download, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MachineList from './MachineList';
import AddMachine from './AddMachine';
import { apiService } from '../services/api';
import { MachineWithComponents } from '../services/api';

interface Component {
  id: number;
  name: string;
  status: 'good' | 'warning' | 'critical';
  last_maintenance: string | null;
  next_maintenance: string | null;
  machine_id: number;
}

interface Machine {
  id: number;
  name: string;
  components: Component[];
}

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [stats, setStats] = useState({ active: 0, good: 0, warning: 0, critical: 0 });
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhoto, setUserPhoto] = useState('');
  const navigate = useNavigate();

  const calculateStats = (machines: Machine[]) => {
    let good = 0, warning = 0, critical = 0;
    machines.forEach(machine => {
      machine.components.forEach(component => {
        if (component.status === 'good') good++;
        else if (component.status === 'warning') warning++;
        else if (component.status === 'critical') critical++;
      });
    });
    return {
      active: good + warning + critical,
      good,
      warning,
      critical
    };
  };

  const fetchMachines = async () => {
    try {
      const [machinesData, componentsData] = await Promise.all([
        apiService.getMachines(),
        apiService.getComponents()
      ]);
      const merged = machinesData.map(machine => ({
        ...machine,
        components: componentsData.filter(c => c.machine_id === machine.id)
      }));
      setMachines(merged);
      setStats(calculateStats(merged));
    } catch (error) {
      console.error('Failed to fetch machines/components', error);
    }
  };

  useEffect(() => {
    fetchMachines();
    const storedName = localStorage.getItem('userName');
    const storedPhoto = localStorage.getItem('userPhoto');
    if (storedName) {
      setUserName(storedName);
    }
    if (storedPhoto) {
      setUserPhoto(storedPhoto);
    }
  }, []);

  const handleDataChanged = () => {
    fetchMachines();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-400">SmartMonitor</h1>

        <div className="flex items-center space-x-4 relative">
          <div className="relative">
            <Bell className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-xs w-5 h-5 rounded-full flex items-center justify-center">3</span>
          </div>
          <div
            className="flex items-center space-x-2 cursor-pointer hover:text-blue-400"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
              {userPhoto ? (
                <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <span>{userName || 'User'}</span>
          </div>

          {showDropdown && (
            <div className="absolute top-12 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg w-48 z-50">
              <button
                className="w-full px-4 py-2 text-left hover:bg-gray-700"
                onClick={() => {
                  setShowDropdown(false);
                  navigate('/profile');
                }}
              >
                Profile
              </button>
              <button
                className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center"
                onClick={() => {
                  setShowDropdown(false);
                  localStorage.removeItem('userName');
                  localStorage.removeItem('userEmail');
                  localStorage.removeItem('userPhone');
                  localStorage.removeItem('userPhoto');
                  onLogout();
                }}
              >
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <p className="text-gray-400">Monitor your spare parts performance</p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
            <button className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Spares', count: stats.active, color: 'blue', icon: '📊' },
            { label: 'Good Status', count: stats.good, color: 'green', icon: '✅' },
            { label: 'Warning', count: stats.warning, color: 'orange', icon: '⚠️' },
            { label: 'Critical', count: stats.critical, color: 'red', icon: '❗' },
          ].map(({ label, count, color, icon }) => (
            <div key={label} className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400">{label}</h3>
                <div className={`w-10 h-10 bg-${color}-600 rounded-lg flex items-center justify-center`}>
                  <span>{icon}</span>
                </div>
              </div>
              <p className="text-3xl font-bold">{count}</p>
            </div>
          ))}
        </div>

        <div className="mb-6 flex justify-end">
          <button
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg"
            onClick={() => setShowAddMachine(true)}
          >
            + Add Machine
          </button>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Machines</h3>
          <MachineList machines={machines as MachineWithComponents[]} onDataChanged={handleDataChanged} />
        </div>

        {showAddMachine && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl"
                onClick={() => setShowAddMachine(false)}
              >
                &times;
              </button>
              <AddMachine
                onClose={() => {
                  setShowAddMachine(false);
                  handleDataChanged();
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
