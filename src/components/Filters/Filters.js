import React from 'react';
import './Filters.css';

const CATEGORIES = ['journalism', 'Mining Engineering', 'Computer Engineering', 'Food and Agricultural Sciences', 'Commercial Departments', 'Health Science', 'Petroleum Engineering', 'Woodwork', 'Finance', 'Accounting', 'Marketing', 'Fashion Designing', 'Mechanical Engineering', 'Electrical Engineering','Plumbing','General', 'Civil Engineering','Health and Safety'];
const WORK_MODES = ['remote', 'hybrid', 'onsite'];

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
      <Select label="Department" value={filters.category} onChange={set('category')} options={CATEGORIES} />
      <Select label="Work mode" value={filters.workMode} onChange={set('workMode')} options={WORK_MODES} />
      <div className="field filters__field">
        <label>Location</label>
        <input className="input" placeholder="any" value={filters.location} onChange={(e) => onChange({ location: e.target.value })} />
      </div>
    </aside>
  );
}
