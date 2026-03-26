import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import KanbanBoard from './pages/KanbanBoard';
import SprintBoard from './pages/SprintBoard';
import Teams from './pages/Teams';
import TeamDetails from './pages/TeamDetails';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Sprints from './pages/Sprints';
import Timeline from './pages/Timeline';
import Settings from './pages/Settings';
import AdminImport from './pages/AdminImport';
import FileViewer from './pages/FileViewer';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-right" />
        <Router>
          <Routes>
            {/* Public routing */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
            </Route>

            {/* Protected Area */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />

              <Route path="/teams" element={<Teams />} />
              <Route path="/teams/:teamId" element={<TeamDetails />} />
              <Route path="/teams/:teamId/sprints" element={<Sprints />} />
              <Route path="/teams/:teamId/kanban" element={<KanbanBoard />} />
              <Route path="/teams/:teamId/sprint-board" element={<SprintBoard />} />

              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:projectId" element={<ProjectDetails />} />

              <Route path="/timeline" element={<Timeline />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin/import" element={<AdminImport />} />
              <Route path="/viewer" element={<FileViewer />} />

              {/* Catch-all for scaffold */}
              <Route path="*" element={<div className="p-6 text-center text-slate-500 flex flex-col items-center justify-center p-12">Page under construction...</div>} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
