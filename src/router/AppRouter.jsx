import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import ProtectedRoute from '../components/ProtectedRoute'
import LoginPage from '../pages/LoginPage'
import SetPasswordPage from '../pages/SetPasswordPage'
import DealsPage from '../pages/DealsPage'
import DealDetailPage from '../pages/DealDetailPage'
import OrganisationsPage from '../pages/OrganisationsPage'
import OrganisationDetailPage from '../pages/OrganisationDetailPage'
import ContactsPage from '../pages/ContactsPage'
import ContactDetailPage from '../pages/ContactDetailPage'
import UsersPage from '../pages/UsersPage'
import AccountSettingsPage from '../pages/AccountSettingsPage'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/deals" replace />} />
                <Route path="/deals" element={<DealsPage />} />
                <Route path="/deals/:id" element={<DealDetailPage />} />
                <Route path="/organisations" element={<OrganisationsPage />} />
                <Route path="/organisations/:id" element={<OrganisationDetailPage />} />
                <Route path="/contacts" element={<ContactsPage />} />
                <Route path="/contacts/:id" element={<ContactDetailPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/account-settings" element={<AccountSettingsPage />} />
                <Route path="/reports" element={<div style={{ padding: 24 }}><h1>Reports</h1><p>Coming soon.</p></div>} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
