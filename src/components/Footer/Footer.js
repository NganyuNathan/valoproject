import React from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import { FaLinkedin, FaTwitter, FaInstagram, FaFacebook } from 'react-icons/fa';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <div className="footer__brand">
            <span className="navbar__mark"><HiOutlineAcademicCap /></span>
            InternPath
          </div>
          <p>One portal for verified placements, honest stipend information, and applications you can actually keep track of.</p>
          <div className="footer__social">
            <a href="https://linkedin.com" aria-label="LinkedIn"><FaLinkedin /></a>
            <a href="https://twitter.com" aria-label="Twitter"><FaTwitter /></a>
            <a href="https://instagram.com" aria-label="Instagram"><FaInstagram /></a>
            <a href="https://facebook.com" aria-label="Facebook"><FaFacebook /></a>
          </div>
        </div>

        <div>
          <h4>Company</h4>
          <ul>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/companies">Partner companies</Link></li>
          </ul>
        </div>

        <div>
          <h4>Students</h4>
          <ul>
            <li><Link to="/internships">Browse internships</Link></li>
            <li><Link to="/register">Create account</Link></li>
            <li><Link to="/login">Sign in</Link></li>
          </ul>
        </div>

        <div>
          <h4>Legal</h4>
          <ul>
            <li><Link to="/privacy">Privacy policy</Link></li>
            <li><Link to="/terms">Terms of service</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer__bottom container">
        <span>© {new Date().getFullYear()} InternPath. All rights reserved.</span>
      </div>
    </footer>
  );
}
