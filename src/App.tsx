import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { ConfirmEmailPage } from './pages/ConfirmEmailPage'
import { ProcessingStatusPage } from './pages/ProcessingStatusPage'
import { AnalysisResultPage } from './pages/AnalysisResultPage'
import { SignupPage } from './pages/SignupPage'
import { UploadVideoPage } from './pages/UploadVideoPage'
import { AppErrorBoundary } from './components/ui/AppErrorBoundary'
import './App.css'

function App() {
  return (
    <AppErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadVideoPage />} />
            <Route path="/processing/:videoId" element={<ProcessingStatusPage />} />
            <Route path="/analysis/:videoId" element={<AnalysisResultPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppErrorBoundary>
  )
}

export default App
