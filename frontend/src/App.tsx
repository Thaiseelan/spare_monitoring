import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ComponentDashboard from './components/ComponentDashboard';
import ComponentDetail from './components/ComponentDetail';
import AddComponent from './components/AddComponent';
import MachineDetails from './components/MachineDetails';
import SensorDetails from './components/SensorDetails';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/machine/:machineId/:component" element={<ComponentDashboard />} />
        <Route path="/component/:id" element={<ComponentDetail />} />
        <Route path="/sensor/:componentId" element={<SensorDetails />} />
        <Route path="/add-component" element={<AddComponent machineId={0} onClose={function (): void {
          throw new Error('Function not implemented.');
        } } onComponentAdded={function (): void {
          throw new Error('Function not implemented.');
        } } />} />
        <Route path="/machine-details/:id" element={<MachineDetails />} />
      </Routes>
    </Router>
  );
}

export default App;
