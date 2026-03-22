import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Import modules for direct routing
import ProjectDashboard from './pages/ProjectDashboard';
import UploadTrackers from './pages/Trackers/UploadTrackers';
import EmployeeMaster from './pages/Masters/EmployeeMaster';
import EmployeeAccess from './pages/Masters/EmployeeAccess';
import ProjectMaster from './pages/Masters/ProjectMaster';
import PartMaster from './pages/Masters/PartMaster';
import DepartmentMaster from './pages/Masters/DepartmentMaster';
import Masters from './pages/Masters/Masters';
import MOMModule from './pages/mom/MOMModule';
import SystemSettings from './pages/Settings/SystemSettings';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="projects" replace />} />
            <Route path="projects" element={<ProjectDashboard />} />
            <Route path="trackers" element={<UploadTrackers />} />
            
            <Route path="masters" element={<Masters />} />
            <Route path="masters/employees" element={<EmployeeMaster />} />
            <Route path="masters/access" element={<EmployeeAccess />} />
            <Route path="masters/project-master" element={<ProjectMaster />} />
            <Route path="masters/parts" element={<PartMaster />} />
            <Route path="masters/departments" element={<DepartmentMaster />} />
            
            <Route path="mom" element={<MOMModule />} />
            <Route path="settings" element={<SystemSettings />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
