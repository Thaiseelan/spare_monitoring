// App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import AuthForm from './components/AuthForm';
import PrivateRoute from './components/PrivateRoute';
import Profile from './components/Profile';
import ComponentDashboard from './components/ComponentDashboard';
import ComponentDetail from './components/ComponentDetail';
import AddComponent from './components/AddComponent';
import MachineDetails from './components/MachineDetails';
import SensorDetails from './components/SensorDetails';

const App = () => {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) setLoggedIn(true);
  }, []);

  const handleLogin = () => {
    localStorage.setItem('authToken', 'dummy_token');
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userPhoto');
    setLoggedIn(false);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route path="/login" element={<AuthForm onLogin={handleLogin} />} />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/machine/:machineId/:component"
          element={
            <PrivateRoute>
              <ComponentDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/component/:id"
          element={
            <PrivateRoute>
              <ComponentDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/add-component"
          element={
            <PrivateRoute>
              <AddComponent machineId={0} onClose={() => { }} onComponentAdded={() => { }} />
            </PrivateRoute>
          }
        />
        <Route
          path="/machine-details/:id"
          element={
            <PrivateRoute>
              <MachineDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/sensor/:componentId"
          element={
            <PrivateRoute>
              <SensorDetails />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;