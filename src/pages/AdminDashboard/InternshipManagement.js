import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineArchive } from 'react-icons/hi';
import { listInternships, createInternship, updateInternship, deleteInternship, setInternshipStatus } from '../../services/internshipService';
import { listCompanies } from '../../services/companyService';
import './AdminTables.css';

const emptyForm = { company_id: '', title: '', description: '', responsibilities: '', requirements: '', skills_required: '', salary: '', location: '', internship_type: 'remote', duration: '', category: '', deadline: '', status: 'published' };

export default function InternshipManagement() {
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([listInternships({ pageSize: 100 }), listCompanies()])
      .then(([{ data }, comps]) => { setItems(data || []); setCompanies(comps || []); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const openNew = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (item) => { setForm({ ...emptyForm, ...item, company_id: item.company_id }); setEditingId(item.id); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateInternship(editingId, form);
        toast.success('Internship updated');
      } else {
        await createInternship(form);
        toast.success('Internship posted');
      }
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this internship?')) return;
    try { await deleteInternship(id); toast.success('Deleted'); load(); } catch (err) { toast.error(err.message); }
  };

  const handleArchive = async (id, status) => {
    try { await setInternshipStatus(id, status === 'archived' ? 'published' : 'archived'); toast.success('Status updated'); load(); } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="admin-header">
        <h1>Internship management</h1>
        <button className="btn btn-primary" onClick={openNew}><HiOutlinePlus /> Add internship</button>
      </div>

      {loading ? <div className="skeleton" style={{ height: 300 }} /> : (
        <div className="card admin-table-wrap">
          <table className="table">
            <thead><tr><th>Title</th><th>Company</th><th>Category</th><th>Status</th><th>Deadline</th><th></th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.title}</td>
                  <td>{i.companies?.name}</td>
                  <td>{i.category}</td>
                  <td><span className={`chip`}>{i.status}</span></td>
                  <td>{i.deadline}</td>
                  <td className="admin-table__actions">
                    <button onClick={() => openEdit(i)} aria-label="Edit"><HiOutlinePencil /></button>
                    <button onClick={() => handleArchive(i.id, i.status)} aria-label="Archive"><HiOutlineArchive /></button>
                    <button onClick={() => handleDelete(i.id)} aria-label="Delete"><HiOutlineTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="card modal admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header"><h2>{editingId ? 'Edit internship' : 'Add internship'}</h2></div>
            <form onSubmit={handleSubmit} className="modal__body">
              <div className="field"><label>Company</label>
                <select className="input" value={form.company_id} onChange={set('company_id')} required>
                  <option value="">Select company</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field"><label>Title</label><input className="input" value={form.title} onChange={set('title')} required /></div>
              <div className="field"><label>Description</label><textarea className="input" rows={3} value={form.description} onChange={set('description')} /></div>
              <div className="field"><label>Responsibilities (one per line)</label><textarea className="input" rows={3} value={form.responsibilities} onChange={set('responsibilities')} /></div>
              <div className="field"><label>Requirements (one per line)</label><textarea className="input" rows={3} value={form.requirements} onChange={set('requirements')} /></div>
              <div className="field"><label>Skills required (comma separated)</label><input className="input" value={form.skills_required} onChange={set('skills_required')} /></div>
              <div className="grid-2">
                <div className="field"><label>Salary / stipend</label><input className="input" type="number" value={form.salary} onChange={set('salary')} /></div>
                <div className="field"><label>Location</label><input className="input" value={form.location} onChange={set('location')} /></div>
              </div>
              <div className="grid-2">
                <div className="field"><label>Type</label>
                  <select className="input" value={form.internship_type} onChange={set('internship_type')}>
                    <option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">Onsite</option>
                  </select>
                </div>
                <div className="field"><label>Duration</label><input className="input" value={form.duration} onChange={set('duration')} placeholder="e.g. 3 Months" /></div>
              </div>
              <div className="grid-2">
                <div className="field"><label>Category</label><input className="input" value={form.category} onChange={set('category')} /></div>
                <div className="field"><label>Deadline</label><input className="input" type="date" value={form.deadline} onChange={set('deadline')} /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Save changes' : 'Publish internship'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
