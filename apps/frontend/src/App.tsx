import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminRoute } from './components/layout/AdminRoute';
import { PublicRoute } from './components/layout/PublicRoute';

// Public Landing Pages
import Home from './pages/landing/Home';
import Pricing from './pages/landing/Pricing';
import Controls from './pages/landing/Controls';
import PrivacyPolicy from './pages/landing/legal/PrivacyPolicy';
import TermsOfService from './pages/landing/legal/TermsOfService';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import WaitingRoom from './pages/dashboard/WaitingRoom';
import ModuleApp from './pages/modules/ModuleApp';
import TenantOnboarding from './pages/tenant/TenantOnboarding';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import ProvisioningManager from './pages/admin/ProvisioningManager';
import DirectoryControl from './pages/admin/DirectoryControl';
import SystemAudits from './pages/admin/SystemAudits';
import RolesManager from './pages/admin/RolesManager';
import ModuleManager from './pages/admin/ModuleManager';
import SecurityControl from './pages/admin/SecurityControl';
import WorkspaceSettings from './pages/admin/WorkspaceSettings';
import BillingSettings from './pages/admin/BillingSettings';
import CustomFormManager from './pages/admin/CustomFormManager';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* --- PUBLIC MARKETING ECOSYSTEM --- */}
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/controls" element={<Controls />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />

        {/* Public Routes (Requires user to be logged OUT) */}
        <Route element={<PublicRoute />}>
          <Route path="/onboard-workspace" element={<TenantOnboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* --- SECURED WORKSPACE (Requires Authentication) --- */}
        <Route element={<ProtectedRoute />}>
          
          <Route path="/waiting-room" element={<WaitingRoom />} />
          <Route path="/app" element={<ModuleApp />} />

          {/* HR Admin Only Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<ProvisioningManager />} />
              <Route path="form-builder" element={<CustomFormManager />} />
              <Route path="directory" element={<DirectoryControl />} />
              <Route path="audits" element={<SystemAudits />} />
              <Route path="roles" element={<RolesManager />} />
              <Route path="modules" element={<ModuleManager />} />
              <Route path="security" element={<SecurityControl />} />
              <Route path="settings" element={<WorkspaceSettings />} />
              <Route path="billing" element={<BillingSettings />} />
            </Route>
          </Route>

        </Route>

        {/* Catch-all 404 redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}