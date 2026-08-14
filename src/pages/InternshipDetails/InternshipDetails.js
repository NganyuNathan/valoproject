import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineLocationMarker, HiOutlineClock, HiOutlineCurrencyDollar, HiOutlineCalendar } from 'react-icons/hi';
import { getInternshipById, saveInternship } from '../../services/internshipService';
import { useAuth } from '../../context/AuthContext';
import ApplicationModal from '../Applications/ApplicationModal';
import { formatCurrency, formatDate, initials } from '../../utils/formatters';
import './InternshipDetails.css';

export default function InternshipDetails() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    getInternshipById(id)
      .then(setInternship)
      .catch(() => toast.error('Could not load this internship'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!isAuthenticated) return toast.error('Sign in to save internships');
    try {
      await saveInternship(user.id, id);
      toast.success('Saved internship');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="container" style={{ padding: '60px 0' }}><div className="skeleton" style={{ height: 400 }} /></div>;
  if (!internship) return <div className="container" style={{ padding: '60px 0' }}><p>Internship not found.</p></div>;

  const company = internship.companies || {};

  return (
    <div className="container internship-details">
      <div className="internship-details__header card">
        <div className="internship-details__logo">
          {company.logo ? <img src={company.logo} alt="" /> : initials(company.name)}
        </div>
        <div>
          <h1>{internship.title}</h1>
          <p className="internship-details__company">{company.name}</p>
          <div className="internship-details__meta">
            <span><HiOutlineLocationMarker /> {internship.location}</span>
            <span><HiOutlineClock /> {internship.duration}</span>
            <span><HiOutlineCurrencyDollar /> {formatCurrency(internship.salary)}</span>
            <span><HiOutlineCalendar /> Apply by {formatDate(internship.deadline)}</span>
          </div>
        </div>
        <div className="internship-details__actions">
          <button className="btn btn-outline" onClick={handleSave}>Save</button>
          <button className="btn btn-primary" onClick={() => (isAuthenticated ? setApplying(true) : toast.error('Sign in to apply'))}>Apply now</button>
        </div>
      </div>

      <div className="internship-details__body">
        <section>
          <h2>About this internship</h2>
          <p>{internship.description}</p>
        </section>
        {internship.responsibilities && (
          <section>
            <h2>Responsibilities</h2>
            <ul className="bullet-list">{internship.responsibilities.split('\n').filter(Boolean).map((r) => <li key={r}>{r}</li>)}</ul>
          </section>
        )}
        {internship.requirements && (
          <section>
            <h2>Requirements</h2>
            <ul className="bullet-list">{internship.requirements.split('\n').filter(Boolean).map((r) => <li key={r}>{r}</li>)}</ul>
          </section>
        )}
        {internship.skills_required && (
          <section>
            <h2>Required skills</h2>
            <div className="internship-details__skills">
              {internship.skills_required.split(',').map((s) => <span key={s} className="chip">{s.trim()}</span>)}
            </div>
          </section>
        )}
        {internship.benefits && (
          <section>
            <h2>Benefits</h2>
            <p>{internship.benefits}</p>
          </section>
        )}
        {company.description && (
          <section>
            <h2>About {company.name}</h2>
            <p>{company.description}</p>
          </section>
        )}
      </div>

      {applying && <ApplicationModal internship={internship} onClose={() => setApplying(false)} />}
    </div>
  );
}
