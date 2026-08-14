import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineLocationMarker, HiOutlineClock, HiOutlineCurrencyDollar, HiOutlineCalendar, HiOutlineBookmark, HiBookmark } from 'react-icons/hi';
import { formatCurrency, formatDate, daysUntil, initials } from '../../utils/formatters';
import './InternshipCard.css';

export default function InternshipCard({ internship, saved, onSave, onApply, showApply = true }) {
  if (!internship) return null;
  const company = internship.companies || {};
  const deadlineDays = daysUntil(internship.deadline);

  return (
    <motion.article
      className="card internship-card"
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      <div className="internship-card__top">
        <div className="internship-card__logo">
          {company.logo ? <img src={company.logo} alt={`${company.name} logo`} /> : initials(company.name || 'IN')}
        </div>
        <div className="internship-card__title-block">
          <h3>{internship.title}</h3>
          <span className="internship-card__company">{company.name}</span>
        </div>
        <span className={`chip internship-card__mode internship-card__mode--${internship.internship_type}`}>
          {internship.internship_type}
        </span>
      </div>

      {internship.description && <p className="internship-card__desc">{internship.description}</p>}

      <div className="internship-card__meta">
        <span><HiOutlineLocationMarker /> {internship.location}</span>
        <span><HiOutlineClock /> {internship.duration}</span>
        <span><HiOutlineCurrencyDollar />{(internship.salary)} FCFA </span>
        <span><HiOutlineCalendar /> {formatDate(internship.deadline)}</span>
      </div>

      {internship.skills_required && (
        <div className="internship-card__skills">
          {String(internship.skills_required).split(',').slice(0, 4).map((s) => (
            <span key={s} className="chip">{s.trim()}</span>
          ))}
        </div>
      )}

      <div className="internship-card__footer">
        <span className="internship-card__deadline">
          {deadlineDays === null ? '' : deadlineDays === 0 ? 'Closes today' : `Closes in ${deadlineDays} days`}
        </span>
        <div className="internship-card__buttons">
          <button
            className="internship-card__save"
            aria-label={saved ? 'Remove from saved' : 'Save internship'}
            onClick={() => onSave?.(internship)}
          >
            {saved ? <HiBookmark /> : <HiOutlineBookmark />}
          </button>
          <Link to={`/internships/${internship.id}`} className="btn btn-outline btn-sm">View details</Link>
          {showApply && (
            <button className="btn btn-primary btn-sm" onClick={() => onApply?.(internship)}>Apply</button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
