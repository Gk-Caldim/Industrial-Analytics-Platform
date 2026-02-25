import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import UploadTrackers from './pages/Trackers/UploadTrackers';
import ProjectDashboard from './pages/ProjectDashboard';
import FileViewerPage from './pages/FileViewerPage';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Dashboard route - this contains the sidebar and header */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />

            {/* Redirect legacy module routes to dashboard with module state */}
            <Route
              path="/upload-trackers"
              element={
                <PrivateRoute>
                  <Navigate to="/dashboard" state={{ module: 'upload-trackers' }} replace />
                </PrivateRoute>
              }
            />

            <Route
              path="/project-dashboard"
              element={
                <PrivateRoute>
                  <Navigate to="/dashboard" state={{ module: 'project-dashboard' }} replace />
                </PrivateRoute>
              }
            />

            <Route
              path="/file-viewer/:trackerId"
              element={
                <PrivateRoute>
                  <Navigate to="/dashboard" state={{ module: 'project-dashboard' }} replace />
                </PrivateRoute>
              }
            />

            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
