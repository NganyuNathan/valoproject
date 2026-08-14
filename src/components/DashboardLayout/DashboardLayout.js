import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { HiOutlineMenu } from 'react-icons/hi';
import Sidebar from '../Sidebar/Sidebar';
import './DashboardLayout.css';

export default function DashboardLayout({ variant = 'student' }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      <button className="dashboard-layout__mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <HiOutlineMenu /> Menu
      </button>
      <Sidebar variant={variant} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="dashboard-layout__content">
        <Outlet />
      </main>
    </div>
  );
}
