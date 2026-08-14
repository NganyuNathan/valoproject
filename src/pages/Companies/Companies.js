import React, { useEffect, useState } from 'react';
import { listCompanies } from '../../services/companyService';
import { initials } from '../../utils/formatters';
import './Companies.css';

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { listCompanies().then(setCompanies).catch(() => setCompanies([])).finally(() => setLoading(false)); }, []);

  return (
    <div className="container companies-page">
      <h1>Partner companies</h1>
      <p>Every employer on InternPath is reviewed before their listings go live.</p>
      {loading ? (
        <div className="companies-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 140 }} />)}</div>
      ) : (
        <div className="companies-grid">
          {companies.map((c) => (
            <div key={c.id} className="card company-card">
              <div className="company-card__logo">{c.logo ? <img src={c.logo} alt="" /> : initials(c.name)}</div>
              <h3>{c.name}</h3>
              <span className="chip">{c.industry}</span>
              <p>{c.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
