import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineBriefcase, HiOutlineShieldCheck, HiOutlineLightningBolt,
  HiOutlineChartBar, HiOutlineLockClosed, HiOutlineCode, HiOutlineGlobeAlt,
  HiOutlineDeviceMobile, HiOutlineChip, HiOutlineCloud, HiOutlineCurrencyDollar,
  HiOutlineCalculator, HiOutlineVolumeUp, HiOutlinePencilAlt, HiOutlineCog,
} from 'react-icons/hi';
import SearchBar from '../../components/SearchBar/SearchBar';
import InternshipCard from '../../components/InternshipCard/InternshipCard';
import { listInternships } from '../../services/internshipService';
import './Landing.css';

const FEATURES = [
  { icon: <HiOutlineBriefcase />, title: 'Thousands of Opportunities', text: 'New internships added daily across every major industry.' },
  { icon: <HiOutlineShieldCheck />, title: 'Verified Companies', text: 'Every employer is reviewed before their listings go live.' },
  { icon: <HiOutlineLightningBolt />, title: 'Easy Application Process', text: 'Apply in minutes with your saved resume and profile.' },
  { icon: <HiOutlineChartBar />, title: 'Internship Tracking', text: 'Follow every application from submitted to accepted.' },
  { icon: <HiOutlineLockClosed />, title: 'Secure Student Profiles', text: 'Your documents and data stay private and protected.' },
];

const CATEGORIES = [
  { icon: <HiOutlineCode />, label: 'Software Engineering' },
  { icon: <HiOutlineGlobeAlt />, label: 'Web Development' },
  { icon: <HiOutlineDeviceMobile />, label: 'Mobile Development' },
  { icon: <HiOutlineChartBar />, label: 'Data Science' },
  { icon: <HiOutlineChip />, label: 'Artificial Intelligence' },
  { icon: <HiOutlineShieldCheck />, label: 'Cybersecurity' },
  { icon: <HiOutlineGlobeAlt />, label: 'Networking' },
  { icon: <HiOutlineCloud />, label: 'Cloud Computing' },
  { icon: <HiOutlineCurrencyDollar />, label: 'Finance' },
  { icon: <HiOutlineCalculator />, label: 'Accounting' },
  { icon: <HiOutlineVolumeUp />, label: 'Marketing' },
  { icon: <HiOutlinePencilAlt />, label: 'Graphic Design' },
  { icon: <HiOutlineCog />, label: 'Mechanical Engineering' },
  { icon: <HiOutlineChip />, label: 'Electrical Engineering' },
  { icon: <HiOutlineCog />, label: 'Civil Engineering' },
];

const TESTIMONIALS = [
  { name: 'Ananya Sharma', role: 'Frontend Intern @ Nimbus Labs', quote: 'InternPath matched me with a remote React role within two weeks of signing up.' },
  { name: 'Daniel Osei', role: 'Data Science Intern @ Vertex Analytics', quote: 'The tracker meant I never lost sight of where each application actually stood.' },
  { name: 'Mei Lin', role: 'Cybersecurity Intern @ Sentinel Secure', quote: 'Every listing felt genuine — real stipend numbers, real deadlines, no guesswork.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listInternships({ page: 1, pageSize: 4 })
      .then(({ data }) => setFeatured(data || []))
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <div className="container hero__grid">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="hero__eyebrow">2026 internship intake is open</span>
            <h1>Find your dream internship</h1>
            <p className="hero__subtitle">One portal for verified placements, honest stipend information and applications you can actually keep track of.</p>
            <SearchBar
              placeholder="Role, company, skill or city"
              onSearch={(q) => navigate(`/internships${q ? `?search=${encodeURIComponent(q)}` : ''}`)}
            />
            <div className="hero__ctas">
              <Link to="/internships" className="btn btn-primary">Browse opportunities</Link>
              <Link to="/register" className="btn btn-outline">Register now</Link>
            </div>
            <div className="hero__stats">
              <div><strong>1,240+</strong><span>Live listings</span></div>
              <div><strong>310</strong><span>Verified companies</span></div>
              <div><strong>18k</strong><span>Students placed</span></div>
            </div>
          </motion.div>

          <motion.div
            className="hero__image"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <img src="/landing.jpeg" alt="landing.jpeg" />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <div className="container">
          <h2 className="section__title">Why students use VALOINERN</h2>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <motion.div key={f.title} className="card feature-card" whileHover={{ y: -4 }}>
                <span className="feature-card__icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section section--tinted">
        <div className="container">
          <h2 className="section__title">Explore by category</h2>
          <div className="categories-grid">
            {CATEGORIES.map((c) => (
              <Link to={`/internships?category=${encodeURIComponent(c.label)}`} key={c.label} className="category-pill">
                <span>{c.icon}</span>{c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured internships */}
      <section className="section">
        <div className="container">
          <div className="section__header">
            <h2 className="section__title">Featured internships</h2>
            <Link to="/internships" className="btn btn-outline btn-sm">View all</Link>
          </div>
          <div className="featured-grid">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 260 }} />)
              : featured.length
                ? featured.map((i) => <InternshipCard key={i.id} internship={i} showApply={false} />)
                : <p>New internships are being verified — check back soon.</p>}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section section--tinted">
        <div className="container">
          <h2 className="section__title">Student success stories</h2>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card testimonial-card">
                <p>&ldquo;{t.quote}&rdquo;</p>
                <div className="testimonial-card__author">
                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner companies */}
      <section className="section">
        <div className="container">
          <h2 className="section__title">Trusted by</h2>
          <div className="partners-row">
            {['Nimbus Labs', 'Vertex Analytics', 'Harbor Financial', 'Sentinel Secure', 'Northwind Cloud', 'Beacon Studio'].map((name) => (
              <span key={name} className="partners-row__item">{name}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
