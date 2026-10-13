import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import { PageLoader } from './components/LoadingSpinner';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GroupDetail from './pages/GroupDetail';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader text="Authenticating..." />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Public Route wrapper (redirect if already logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader text="Loading..." />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {user && <Navbar />}
      <main>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups/:groupId"
            element={
              <ProtectedRoute>
                <GroupDetail />
              </ProtectedRoute>
            }
          />
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}