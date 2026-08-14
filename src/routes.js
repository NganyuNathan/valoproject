import { lazy } from 'react';

// Lazy-loaded route components for code splitting.
export const Landing = lazy(() => import('./pages/Landing/Landing'));
export const Internships = lazy(() => import('./pages/Internships/Internships'));
export const InternshipDetails = lazy(() => import('./pages/InternshipDetails/InternshipDetails'));
export const Companies = lazy(() => import('./pages/Companies/Companies'));
export const About = lazy(() => import('./pages/Static/About'));
export const Contact = lazy(() => import('./pages/Static/Contact'));
export const Privacy = lazy(() => import('./pages/Static/Privacy'));
export const Terms = lazy(() => import('./pages/Static/Terms'));

export const Login = lazy(() => import('./pages/Login/Login'));
export const Register = lazy(() => import('./pages/Register/Register'));
export const ForgotPassword = lazy(() => import('./pages/ForgotPassword/ForgotPassword'));
export const ResetPassword = lazy(() => import('./pages/ResetPassword/ResetPassword'));

export const StudentDashboard = lazy(() => import('./pages/StudentDashboard/StudentDashboard'));
export const SavedInternships = lazy(() => import('./pages/StudentDashboard/SavedInternships'));
export const Notifications = lazy(() => import('./pages/StudentDashboard/Notifications'));
export const MyApplications = lazy(() => import('./pages/Applications/MyApplications'));
export const Profile = lazy(() => import('./pages/Profile/Profile'));
export const Settings = lazy(() => import('./pages/Settings/Settings'));

export const AdminDashboard = lazy(() => import('./pages/AdminDashboard/AdminDashboard'));
export const InternshipManagement = lazy(() => import('./pages/AdminDashboard/InternshipManagement'));
export const StudentManagement = lazy(() => import('./pages/AdminDashboard/StudentManagement'));
export const CompanyManagement = lazy(() => import('./pages/AdminDashboard/CompanyManagement'));
export const ApplicationsManagement = lazy(() => import('./pages/AdminDashboard/ApplicationsManagement'));
export const Reports = lazy(() => import('./pages/AdminDashboard/Reports'));
export const Announcements = lazy(() => import('./pages/AdminDashboard/Announcements'));
export const AdminSettings = lazy(() => import('./pages/AdminDashboard/AdminSettings'));

export const NotFound = lazy(() => import('./pages/NotFound/NotFound'));
