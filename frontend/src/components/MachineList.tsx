import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, AlertTriangle, Activity, Trash2 } from 'lucide-react';
import { apiService, Component, Machine as ApiMachine } from '../services/api';
import AddComponent from './AddComponent';
import AddMachine from './AddMachine';

interface MachineWithComponents extends ApiMachine {
  components: Component[];
}

interface MachineListProps {
  machines: MachineWithComponents[];
  onDataChanged: () => void;
}

const MachineList: React.FC<MachineListProps> = ({ machines: initialMachines, onDataChanged }) => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState<MachineWithComponents[]>(initialMachines);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddMachineModal, setShowAddMachineModal] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null);

  useEffect(() => {
    setMachines(initialMachines);
  }, [initialMachines]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-600';
      case 'warning':
        return 'bg-orange-600';
      case 'critical':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <Activity className="w-4 h-4 text-orange-400" />;
      default:
        return <Activity className="w-4 h-4 text-green-400" />;
    }
  };

  const handleComponentClick = (componentId: number) => {
    navigate(`/sensor/${componentId}`);
  };

  const handleAddComponent = (machineId: number) => {
    setSelectedMachineId(machineId);
    setShowAddModal(true);
  };

  const handleDeleteMachine = async (machineId: number) => {
    await apiService.deleteMachine(machineId);
    onDataChanged();
  };

  const handleDeleteComponent = async (componentId: number) => {
    await apiService.deleteComponent(componentId);
    onDataChanged();
  };

  return (
    <div className="space-y-8 pb-4">
      {machines.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
          <h2 className="text-xl font-semibold mb-2">No Machines Found</h2>
          <p className="text-gray-400 mb-4">Add your first machine to get started</p>
          <button
            onClick={() => setShowAddMachineModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Add Machine
          </button>
        </div>
      ) : (
        machines.map(machine => (
          <div key={machine.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">{machine.name}</h2>
              <button
                onClick={() => handleDeleteMachine(machine.id)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <div className="flex space-x-6 min-w-max pb-4">
                {machine.components.map(component => (
                  <div key={component.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 w-80">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold">{component.name}</h3>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(component.status)}
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(component.status)}`}></div>
                      </div>
                    </div>
                    <div className="space-y-3 mb-4 text-sm text-gray-400">
                      {component.last_maintenance && (
                        <div>
                          <strong>Last Maintenance:</strong><br />
                          {new Date(component.last_maintenance).toLocaleDateString()}
                        </div>
                      )}
                      {component.next_maintenance && (
                        <div>
                          <strong>Next Maintenance:</strong><br />
                          {new Date(component.next_maintenance).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleComponentClick(component.id)}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md flex justify-between mb-2"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteComponent(component.id)}
                      className="w-full bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-md flex justify-center"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Component
                    </button>
                  </div>
                ))}
                <div
                  onClick={() => handleAddComponent(machine.id)}
                  className="bg-gray-800 border-2 border-dashed border-gray-600 hover:border-gray-500 rounded-lg p-6 flex-shrink-0 w-80 flex flex-col items-center justify-center cursor-pointer"
                >
                  <div className="w-16 h-16 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center mb-4">
                    <Plus className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-400">Add Component</h3>
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      {showAddModal && selectedMachineId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full relative">
            <button className="absolute top-2 right-2 text-white text-2xl" onClick={() => setShowAddModal(false)}>&times;</button>
            <AddComponent
              machineId={selectedMachineId}
              onClose={() => {
                setShowAddModal(false);
                onDataChanged();
              }}
              onComponentAdded={onDataChanged}
            />
          </div>
        </div>
      )}

      {showAddMachineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full relative">
            <button className="absolute top-2 right-2 text-white text-2xl" onClick={() => setShowAddMachineModal(false)}>&times;</button>
            <AddMachine
              onClose={() => {
                setShowAddMachineModal(false);
                onDataChanged();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineList;