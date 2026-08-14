import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HiOutlineViewGrid, HiOutlineUser, HiOutlineBriefcase, HiOutlineBookmark,
  HiOutlineClipboardList, HiOutlineBell, HiOutlineCog, HiOutlineLogout,
  HiOutlineUsers, HiOutlineOfficeBuilding, HiOutlineDocumentReport, HiOutlineVolumeUp,
} from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../services/authService';
import { initials } from '../../utils/formatters';
import toast from 'react-hot-toast';
import './Sidebar.css';

const STUDENT_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: <HiOutlineViewGrid />, end: true },
  { to: '/dashboard/profile', label: 'My Profile', icon: <HiOutlineUser /> },
  { to: '/internships', label: 'Internship Opportunities', icon: <HiOutlineBriefcase /> },
  { to: '/dashboard/saved', label: 'Saved Internships', icon: <HiOutlineBookmark /> },
  { to: '/dashboard/applications', label: 'My Applications', icon: <HiOutlineClipboardList /> },
  { to: '/dashboard/notifications', label: 'Notifications', icon: <HiOutlineBell /> },
  { to: '/dashboard/settings', label: 'Settings', icon: <HiOutlineCog /> },
];

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: <HiOutlineViewGrid />, end: true },
  { to: '/admin/internships', label: 'Internship Management', icon: <HiOutlineBriefcase /> },
  { to: '/admin/students', label: 'Student Management', icon: <HiOutlineUsers /> },
  { to: '/admin/companies', label: 'Company Management', icon: <HiOutlineOfficeBuilding /> },
  { to: '/admin/applications', label: 'Applications', icon: <HiOutlineClipboardList /> },
  { to: '/admin/reports', label: 'Reports', icon: <HiOutlineDocumentReport /> },
  { to: '/admin/announcements', label: 'Announcements', icon: <HiOutlineVolumeUp /> },
  { to: '/admin/settings', label: 'Settings', icon: <HiOutlineCog /> },
];

export default function Sidebar({ variant = 'student', mobileOpen = false, onClose }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const links = variant === 'admin' ? ADMIN_LINKS : STUDENT_LINKS;

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/');
  };

  return (
    <>
      {mobileOpen && <div className="sidebar__scrim" onClick={onClose} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__profile">
          <div className="sidebar__avatar">
            {profile?.profile_photo ? <img src={profile.profile_photo} alt="" /> : initials(`${profile?.first_name || ''} ${profile?.last_name || ''}`)}
          </div>
          <div>
            <div className="sidebar__name">{profile?.first_name ? `${profile.first_name} ${profile.last_name}` : 'Welcome'}</div>
            <div className="sidebar__role">{variant === 'admin' ? 'Administrator' : 'Student'}</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="sidebar__link" onClick={onClose}>
              <span className="sidebar__icon">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <button className="sidebar__logout" onClick={handleLogout}>
          <HiOutlineLogout /> Logout
        </button>
      </aside>
    </>
  );
}
