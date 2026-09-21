import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { AdminRoute } from './routes/AdminRoute'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminLogsPage } from './pages/AdminLogsPage'
import { AdminManualRequestsPage } from './pages/AdminManualRequestsPage'
import { AdminRequestsPage } from './pages/AdminRequestsPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { AdminVideoDetailPage } from './pages/AdminVideoDetailPage'
import { AdminVideosPage } from './pages/AdminVideosPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { ConfirmEmailPage } from './pages/ConfirmEmailPage'
import { ProcessingStatusPage } from './pages/ProcessingStatusPage'
import { AnalysisResultPage } from './pages/AnalysisResultPage'
import { SignupPage } from './pages/SignupPage'
import { UploadVideoPage } from './pages/UploadVideoPage'
import { AboutPage, ContactPage, HomePage, PrivacyPolicyPage, TermsAndConditionsPage } from './pages/PublicPages'
import { AppErrorBoundary } from './components/ui/AppErrorBoundary'
import { SachAILoader } from './components/SachAILoader/SachAILoader'
import { useAuth } from './auth/AuthContext'
import './App.css'
import './responsive.css'
import './mobile.css'

function App() {
  const auth = useAuth()

  return (
    <AppErrorBoundary>
      <SachAILoader isReady={!auth.isLoading} />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<AppLayout />}>
          <Route path="/upload" element={<UploadVideoPage />} />
          <Route path="/processing/:videoId" element={<ProcessingStatusPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analysis/:videoId" element={<AnalysisResultPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/manual-requests" element={<AdminManualRequestsPage />} />
              <Route path="/admin/videos" element={<AdminVideosPage />} />
              <Route path="/admin/videos/:videoId" element={<AdminVideoDetailPage />} />
              <Route path="/admin/requests" element={<AdminRequestsPage />} />
              <Route path="/admin/logs" element={<AdminLogsPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppErrorBoundary>
  )
}

export default App
