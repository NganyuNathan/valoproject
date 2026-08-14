import React from 'react';
import './Filters.css';

const CATEGORIES = ['Software Engineering', 'Web Development', 'Mobile Development', 'Data Science', 'Artificial Intelligence', 'Cybersecurity', 'Networking', 'Cloud Computing', 'Finance', 'Accounting', 'Marketing', 'Graphic Design', 'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering'];
const WORK_MODES = ['remote', 'hybrid', 'onsite'];
const DURATIONS = ['1 Month', '2 Months', '3 Months', '6 Months', '12 Months'];

function Select({ label, value, onChange, options }) {
  return (
    <div className="field filters__field">
      <label>{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
        ))}
      </select>
    </div>
  );
}

export default function Filters({ filters, onChange, onReset }) {
  const set = (key) => (val) => onChange({ [key]: val });

  return (
    <aside className="filters card">
      <div className="filters__header">
        <h3>Filters</h3>
        <button className="btn-ghost btn-sm" onClick={onReset}>Reset</button>
      </div>
      <Select label="Category" value={filters.category} onChange={set('category')} options={CATEGORIES} />
      <Select label="Work mode" value={filters.workMode} onChange={set('workMode')} options={WORK_MODES} />
      <Select label="Compensation" value={filters.paid} onChange={set('paid')} options={['paid', 'unpaid']} />
      <Select label="Duration" value={filters.duration} onChange={set('duration')} options={DURATIONS} />
      <div className="field filters__field">
        <label>Location</label>
        <input className="input" placeholder="City or 'remote'" value={filters.location} onChange={(e) => onChange({ location: e.target.value })} />
      </div>
    </aside>
  );
}
