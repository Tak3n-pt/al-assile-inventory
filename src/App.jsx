import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import Inventory from './pages/Inventory';
import Clients from './pages/Clients';
import Employers from './pages/Employers';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Suppliers from './pages/Suppliers';
import Documents from './pages/Documents';
import Sales from './pages/Sales';
import Settings from './pages/Settings';

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => {
  return (
    <HashRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="sales" element={<Sales />} />
            <Route path="stock" element={<Stock />} />
            <Route path="clients" element={<Clients />} />
            <Route path="inventory" element={<AdminRoute><Inventory /></AdminRoute>} />
            <Route path="employers" element={<AdminRoute><Employers /></AdminRoute>} />
            <Route path="expenses" element={<AdminRoute><Expenses /></AdminRoute>} />
            <Route path="reports" element={<AdminRoute><Reports /></AdminRoute>} />
            <Route path="suppliers" element={<AdminRoute><Suppliers /></AdminRoute>} />
            <Route path="documents" element={<AdminRoute><Documents /></AdminRoute>} />
            <Route path="settings" element={<AdminRoute><Settings /></AdminRoute>} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
