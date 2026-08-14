import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineUpload } from 'react-icons/hi';
import { listCompanies, createCompany, updateCompany, deleteCompany } from '../../services/companyService';
import { uploadFile, BUCKETS } from '../../services/supabase';
import './AdminTables.css';

const emptyForm = { name: '', logo: '', industry: '', website: '', email: '', phone: '', description: '' };

export default function CompanyManagement() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const load = () => { setLoading(true); listCompanies().then(setCompanies).finally(() => setLoading(false)); };
  useEffect(load, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const openNew = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (c) => { setForm(c); setEditingId(c.id); setShowForm(true); };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadFile(BUCKETS.COMPANY_LOGOS, `${Date.now()}-${file.name}`, file);
      setForm((f) => ({ ...f, logo: url }));
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(err.message || 'Could not upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) { await updateCompany(editingId, form); toast.success('Company updated'); }
      else { await createCompany(form); toast.success('Company added'); }
      setShowForm(false); load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this company?')) return;
    try { await deleteCompany(id); toast.success('Deleted'); load(); } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="admin-header">
        <h1>Company management</h1>
        <button className="btn btn-primary" onClick={openNew}><HiOutlinePlus /> Add company</button>
      </div>

      {loading ? <div className="skeleton" style={{ height: 300 }} /> : (
        <div className="card admin-table-wrap">
          <table className="table">
            <thead><tr><th>Logo</th><th>Name</th><th>Industry</th><th>Contact</th><th>Website</th><th></th></tr></thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="company-logo-thumb">
                      {c.logo ? <img src={c.logo} alt="" /> : (c.name || '?').charAt(0).toUpperCase()}
                    </div>
                  </td>
                  <td>{c.name}</td><td>{c.industry}</td><td>{c.email}</td><td>{c.website}</td>
                  <td className="admin-table__actions">
                    <button onClick={() => openEdit(c)} aria-label="Edit"><HiOutlinePencil /></button>
                    <button onClick={() => handleDelete(c.id)} aria-label="Delete"><HiOutlineTrash /></button>
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
            <div className="modal__header"><h2>{editingId ? 'Edit company' : 'Add company'}</h2></div>
            <form onSubmit={handleSubmit} className="modal__body">
              <div className="field"><label>Company name</label><input className="input" value={form.name} onChange={set('name')} required /></div>

              <div className="field">
                <label>Logo</label>
                <div className="company-logo-row">
                  <div className="company-logo-thumb company-logo-thumb--lg">
                    {form.logo ? <img src={form.logo} alt="" /> : (form.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <label className="file-input">
                    <HiOutlineUpload />
                    {uploadingLogo ? 'Uploading…' : form.logo ? 'Replace logo' : 'Upload logo'}
                    <input type="file" accept="image/*" className="visually-hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  </label>
                </div>
              </div>

              <div className="grid-2">
                <div className="field"><label>Industry</label><input className="input" value={form.industry} onChange={set('industry')} /></div>
                <div className="field"><label>Website</label><input className="input" value={form.website} onChange={set('website')} /></div>
              </div>
              <div className="grid-2">
                <div className="field"><label>Contact email</label><input className="input" type="email" value={form.email} onChange={set('email')} /></div>
                <div className="field"><label>Phone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
              </div>
              <div className="field"><label>Description</label><textarea className="input" rows={3} value={form.description} onChange={set('description')} /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploadingLogo}>{editingId ? 'Save changes' : 'Add company'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
