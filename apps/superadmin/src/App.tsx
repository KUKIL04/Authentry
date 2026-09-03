// apps/superadmin/src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import PlatformOverview from './pages/dashboard/PlatformOverview';
import TenantList from './pages/tenants/TenantList';
import TenantDetails from './pages/tenants/TenantDetails';
import GlobalUsers from './pages/users/GlobalUsers';
import AuditLedger from './pages/audits/AuditLedger';
import SystemTelemetry from './pages/dashboard/SystemTelemetry';
import SgcHealth from './pages/infrastructure/SgcHealth';
import FeatureFlags from './pages/dashboard/FeatureFlags';
import AppsManager from './pages/apps/AppsManager';
import SystemTemplatesManager from './pages/dashboard/SystemTemplatesManager';
import AdminLogin from './pages/auth/AdminLogin';
import ProtectedAdminRoute from './components/layout/ProtectedAdminRoute';
import { AdminAuthProvider } from './hooks/useAdminAuth';

export default function App() {
  return (
    <AdminAuthProvider>
      <Router>
        <Routes>
          {/* Public Login for Platform Owners */}
          <Route path="/login" element={<AdminLogin />} />

          {/* Protected Control Plane Routes */}
          <Route element={<ProtectedAdminRoute />}>
            <Route element={<SuperAdminLayout />}>
              {/* Cleanly redirect root to the dashboard to prevent bounces */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Explicitly define the dashboard route */}
              <Route path="/dashboard" element={<PlatformOverview />} />
              <Route path="/apps" element={<AppsManager />} />
              <Route path="/blueprints" element={<SystemTemplatesManager />} />
              <Route path="/tenants" element={<TenantList />} />
              <Route path="/tenants/:tenantId" element={<TenantDetails />}/>
              <Route path="/users" element={<GlobalUsers />} />
              <Route path="/audits" element={<AuditLedger />} />
              <Route path="/telemetry" element={<SystemTelemetry />} /> 
              <Route path="/sgc-health" element={<SgcHealth />} />             
              <Route path="/tiers" element={<FeatureFlags />} />

              {/* Future routes: /billing, /security, /audits */}
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AdminAuthProvider>
  );
}