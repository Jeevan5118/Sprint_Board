import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import SeoManager from './components/common/SeoManager';
import { Toaster } from 'react-hot-toast';

const AuthLayout = lazy(() => import('./layouts/AuthLayout'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const KanbanBoard = lazy(() => import('./pages/KanbanBoard'));
const SprintBoard = lazy(() => import('./pages/SprintBoard'));
const Teams = lazy(() => import('./pages/Teams'));
const TeamDetails = lazy(() => import('./pages/TeamDetails'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'));
const Sprints = lazy(() => import('./pages/Sprints'));
const Timeline = lazy(() => import('./pages/Timeline'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminImport = lazy(() => import('./pages/AdminImport'));
const FileViewer = lazy(() => import('./pages/FileViewer'));
const Notifications = lazy(() => import('./pages/Notifications'));

const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster position="top-right" />
        <Suspense fallback={<RouteLoader />}>
          <Router>
            <SeoManager />
            <Routes>
              {/* Public routing */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
              </Route>

              {/* Standalone Protected Routes */}
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/power-hour-dashboard" element={<Dashboard isPowerHour={true} />} />

                <Route path="/teams" element={<Teams />} />
                <Route path="/teams/:teamId" element={<TeamDetails />} />
                <Route path="/teams/:teamId/sprints" element={<Sprints />} />
                <Route path="/teams/:teamId/kanban" element={<KanbanBoard />} />
                <Route path="/teams/:teamId/sprint-board" element={<SprintBoard />} />

                <Route path="/power-hour-teams" element={<Teams isPowerHour={true} />} />
                <Route path="/power-hour-teams/:teamId" element={<TeamDetails isPowerHour={true} />} />
                <Route path="/power-hour-teams/:teamId/sprints" element={<Sprints isPowerHour={true} />} />
                <Route path="/power-hour-teams/:teamId/kanban" element={<KanbanBoard isPowerHour={true} />} />
                <Route path="/power-hour-teams/:teamId/sprint-board" element={<SprintBoard isPowerHour={true} />} />

                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:projectId" element={<ProjectDetails />} />
                <Route path="/power-hour-projects" element={<Projects isPowerHour={true} />} />
                <Route path="/power-hour-projects/:projectId" element={<ProjectDetails isPowerHour={true} />} />

                <Route path="/timeline" element={<Timeline />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin/import" element={<AdminImport />} />
                <Route path="/notifications" element={<Notifications />} />

                {/* Catch-all for scaffold */}
                <Route path="*" element={<div className="p-6 text-center text-slate-500 flex flex-col items-center justify-center p-12">Page under construction...</div>} />
              </Route>

              {/* Full Screen Viewer (Needs to be outside DashboardLayout but still protected logic inside) */}
              <Route path="/viewer" element={<FileViewer />} />

              {/* Catch-all for scaffold */}
              <Route path="*" element={<div className="p-6 text-center text-slate-500 flex flex-col items-center justify-center p-12">Page under construction...</div>} />
            </Routes>
          </Router>
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
