import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { InternshipProvider } from './context/InternshipContext';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout/DashboardLayout';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import * as R from './routes';

function PageFallback() {
  return (
    <div style={{ padding: '120px 24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
      Loading…
    </div>
  );
}

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <InternshipProvider>
          <BrowserRouter>
            <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Manrope, sans-serif' } }} />
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Public / visitor routes */}
                <Route path="/" element={<PublicLayout><R.Landing /></PublicLayout>} />
                <Route path="/internships" element={<PublicLayout><R.Internships /></PublicLayout>} />
                <Route path="/internships/:id" element={<PublicLayout><R.InternshipDetails /></PublicLayout>} />
                <Route path="/companies" element={<PublicLayout><R.Companies /></PublicLayout>} />
                <Route path="/about" element={<PublicLayout><R.About /></PublicLayout>} />
                <Route path="/contact" element={<PublicLayout><R.Contact /></PublicLayout>} />
                <Route path="/privacy" element={<PublicLayout><R.Privacy /></PublicLayout>} />
                <Route path="/terms" element={<PublicLayout><R.Terms /></PublicLayout>} />

                {/* Auth routes (navbar shown, no footer) */}
                <Route path="/login" element={<><Navbar /><R.Login /></>} />
                <Route path="/register" element={<><Navbar /><R.Register /></>} />
                <Route path="/forgot-password" element={<><Navbar /><R.ForgotPassword /></>} />
                <Route path="/reset-password" element={<><Navbar /><R.ResetPassword /></>} />

                {/* Student dashboard (protected) */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <><Navbar /><DashboardLayout variant="student" /></>
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<R.StudentDashboard />} />
                  <Route path="profile" element={<R.Profile />} />
                  <Route path="saved" element={<R.SavedInternships />} />
                  <Route path="applications" element={<R.MyApplications />} />
                  <Route path="notifications" element={<R.Notifications />} />
                  <Route path="settings" element={<R.Settings />} />
                </Route>

                {/* Admin dashboard (protected) */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <><Navbar /><DashboardLayout variant="admin" /></>
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<R.AdminDashboard />} />
                  <Route path="internships" element={<R.InternshipManagement />} />
                  <Route path="students" element={<R.StudentManagement />} />
                  <Route path="companies" element={<R.CompanyManagement />} />
                  <Route path="applications" element={<R.ApplicationsManagement />} />
                  <Route path="reports" element={<R.Reports />} />
                  <Route path="announcements" element={<R.Announcements />} />
                  <Route path="settings" element={<R.AdminSettings />} />
                </Route>

                <Route path="*" element={<PublicLayout><R.NotFound /></PublicLayout>} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </InternshipProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
