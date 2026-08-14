import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineMenu, HiOutlineX, HiOutlineAcademicCap, HiOutlineSun, HiOutlineMoon } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../services/authService';
import useTheme from '../../hooks/useTheme';
import toast from 'react-hot-toast';
import './Navbar.css';
// import valoLogo from './valo.jpeg';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, role, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const dashboardPath = role === 'admin' ? '/admin' : '/dashboard';

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand">
          {/* <span className="navbar__mark"> <img src="valo.jpeg" /></span> */}
          <span className="navbar__mark"> <img src="/valo.jpeg" alt="Valointern logo" /></span>
          VALOINERN
        </Link>

        <nav className="navbar__links navbar__links--desktop">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/internships">Internships</NavLink>
          <NavLink to="/companies">Companies</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
        </nav>

        <div className="navbar__actions navbar__actions--desktop">
          <button className="navbar__theme-toggle" onClick={toggleTheme} aria-label="Toggle dark mode">
            {theme === 'light' ? <HiOutlineMoon /> : <HiOutlineSun />}
          </button>
          {isAuthenticated ? (
            <>
              <Link to={dashboardPath} className="btn btn-outline btn-sm">
                {profile?.first_name ? `Hi, ${profile.first_name}` : 'Dashboard'}
              </Link>
              <button className="btn btn-primary btn-sm" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Create account</Link>
            </>
          )}
        </div>

        <button className="navbar__burger" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          {open ? <HiOutlineX /> : <HiOutlineMenu />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="navbar__mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <NavLink to="/" end onClick={() => setOpen(false)}>Home</NavLink>
            <NavLink to="/internships" onClick={() => setOpen(false)}>Internships</NavLink>
            <NavLink to="/companies" onClick={() => setOpen(false)}>Companies</NavLink>
            <NavLink to="/about" onClick={() => setOpen(false)}>About</NavLink>
            <NavLink to="/contact" onClick={() => setOpen(false)}>Contact</NavLink>
            <div className="navbar__mobile-actions">
              {isAuthenticated ? (
                <>
                  <Link to={dashboardPath} className="btn btn-outline btn-block" onClick={() => setOpen(false)}>Dashboard</Link>
                  <button className="btn btn-primary btn-block" onClick={handleLogout}>Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-outline btn-block" onClick={() => setOpen(false)}>Sign in</Link>
                  <Link to="/register" className="btn btn-primary btn-block" onClick={() => setOpen(false)}>Create account</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
