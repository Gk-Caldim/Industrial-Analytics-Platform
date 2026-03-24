import React, { useEffect } from 'react';
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
  useEffect(() => {
    const applyTheme = () => {
      try {
        const savedSettings = localStorage.getItem('system_settings');
        let primary = '#1e3a5f';
        let secondary = '#2c4c7c';
        
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          const themeSetting = settings.find(s => s.id === 'theme_color');
          
          if (themeSetting && themeSetting.value) {
            switch (themeSetting.value) {
              case 'Emerald Green':
                primary = '#059669'; secondary = '#047857'; break;
              case 'Royal Purple':
                primary = '#7c3aed'; secondary = '#6d28d9'; break;
              case 'Crimson Red':
                primary = '#e11d48'; secondary = '#be123c'; break;
              case 'Slate Gray':
                primary = '#475569'; secondary = '#334155'; break;
              case 'Default Blue':
              default:
                primary = '#1e3a5f'; secondary = '#2c4c7c';
            }
          }
        }
        
        document.documentElement.style.setProperty('--theme-primary', primary);
        document.documentElement.style.setProperty('--theme-secondary', secondary);
      } catch (e) {
        console.error('Error applying theme', e);
      }
    };

    applyTheme();
    window.addEventListener('storage', applyTheme);
    window.addEventListener('themeChanged', applyTheme);
    
    return () => {
      window.removeEventListener('storage', applyTheme);
      window.removeEventListener('themeChanged', applyTheme);
    };
  }, []);

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
